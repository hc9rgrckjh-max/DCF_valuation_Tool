/**
 * Yahoo Finance live data fetch — Deno Edge Function (Supabase)
 *
 * Yahoo Finance (as of late 2024) requires a two-step auth handshake for
 * server-side calls:
 *   1. Hit https://fc.yahoo.com to obtain a session cookie (A1 / A3).
 *   2. Use that cookie to GET /v1/test/getcrumb → receive a short crumb string.
 *   3. Append &crumb=<crumb> to every quoteSummary / chart call.
 *
 * Without this the API returns an empty result set → "No data for X".
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FetchResult {
  success: boolean;
  error?: string;
  company_name?: string;
  current_price?: number;
  shares_outstanding?: number; // millions
  free_cash_flow?: number;     // millions
  industry?: string;
  market_cap?: number;         // millions
  currency?: string;
  net_debt?: number;           // millions
  beta?: number;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract a raw numeric value from Yahoo Finance's typical response shapes:
 *   { raw: 123.45, fmt: "123.45" }  OR  just a plain number.
 */
const num = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in (v as Record<string, unknown>)) {
    const raw = (v as { raw: unknown }).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return undefined;
};

/**
 * Extract all Set-Cookie values and reassemble them into a single Cookie
 * header string suitable for subsequent requests.
 *
 * Deno's fetch returns multiple Set-Cookie headers; Headers.get() joins them
 * with ", " which can confuse cookie parsers, so we split carefully.
 */
function extractCookieHeader(headers: Headers): string {
  // Deno exposes getSetCookie() which returns an array of raw Set-Cookie values.
  // Fall back to splitting the joined header if getSetCookie is unavailable.
  const raw: string[] = (headers as unknown as { getSetCookie?: () => string[] })
    .getSetCookie?.() ?? (headers.get("set-cookie") ?? "").split(/,(?=[^ ])/);

  return raw
    .map((c) => c.split(";")[0].trim())   // keep only name=value
    .filter(Boolean)
    .join("; ");
}

/**
 * Step 1 + 2: visit fc.yahoo.com for the consent cookie, then fetch the crumb.
 * Returns { cookie, crumb } or throws on failure.
 */
async function getYahooCrumb(): Promise<{ cookie: string; crumb: string }> {
  // ── Step 1: consent cookie ──────────────────────────────────────────────
  // fc.yahoo.com is a lightweight endpoint that issues the A1/A3 cookies
  // required by the finance APIs.
  const cookieRes = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "follow",
  });
  const cookie = extractCookieHeader(cookieRes.headers);

  if (!cookie) {
    throw new Error("Failed to obtain Yahoo Finance session cookie");
  }

  // ── Step 2: crumb ───────────────────────────────────────────────────────
  const crumbRes = await fetch(
    "https://query1.finance.yahoo.com/v1/test/getcrumb",
    {
      headers: { "User-Agent": UA, Cookie: cookie, Accept: "text/plain" },
    },
  );
  if (!crumbRes.ok) {
    throw new Error(`Crumb fetch failed: HTTP ${crumbRes.status}`);
  }
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.toLowerCase().includes("unauthorized")) {
    throw new Error("Received invalid crumb from Yahoo Finance");
  }

  return { cookie, crumb };
}

/**
 * Authenticated fetch against Yahoo Finance APIs.
 */
async function yahooFetch(
  url: string,
  cookie: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Cookie: cookie,
    },
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${url}`);
  return await res.json() as Record<string, unknown>;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: FetchResult, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const ticker = String(body?.ticker ?? "").trim().toUpperCase();

    if (!ticker) {
      return jsonResponse({ success: false, error: "ticker required" }, 400);
    }

    // ── Auth handshake ──────────────────────────────────────────────────────
    const { cookie, crumb } = await getYahooCrumb();

    // ── Data fetch ──────────────────────────────────────────────────────────
    const modules = [
      "price",
      "summaryDetail",
      "defaultKeyStatistics",
      "summaryProfile",
      "financialData",
      "cashflowStatementHistory",
      "balanceSheetHistory",
    ].join(",");

    const encodedTicker = encodeURIComponent(ticker);
    const encodedCrumb  = encodeURIComponent(crumb);

    const qsUrl    = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodedTicker}?modules=${modules}&crumb=${encodedCrumb}`;
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedTicker}?interval=1d&range=5d&crumb=${encodedCrumb}`;

    const [qsJson, chartJson] = await Promise.allSettled([
      yahooFetch(qsUrl, cookie),
      yahooFetch(chartUrl, cookie),
    ]);

    // quoteSummary is essential
    if (qsJson.status === "rejected") {
      throw new Error(`quoteSummary fetch failed: ${qsJson.reason}`);
    }

    const qs      = qsJson.value as { quoteSummary?: { result?: unknown[] } };
    const result0 = (qs?.quoteSummary?.result ?? [])[0] as Record<string, unknown> | undefined;

    if (!result0) {
      return jsonResponse({
        success: false,
        error:
          `No data found for "${ticker}". ` +
          `Check that the ticker is correct (e.g. SAP.DE for European stocks) ` +
          `and try again.`,
      });
    }

    // ── Parse fields ────────────────────────────────────────────────────────
    const price        = (result0.price          ?? {}) as Record<string, unknown>;
    const summDetail   = (result0.summaryDetail  ?? {}) as Record<string, unknown>;
    const keyStats     = (result0.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    const profile      = (result0.summaryProfile ?? {}) as Record<string, unknown>;
    const finData      = (result0.financialData  ?? {}) as Record<string, unknown>;
    const cfHist       = (result0.cashflowStatementHistory as { cashflowStatements?: unknown[] })?.cashflowStatements ?? [];
    const bsHist       = (result0.balanceSheetHistory     as { balanceSheetStatements?: unknown[] })?.balanceSheetStatements ?? [];

    // Current price
    let currentPrice =
      num(price.regularMarketPrice) ??
      num(finData.currentPrice) ??
      num(summDetail.previousClose);

    if (currentPrice === undefined && chartJson.status === "fulfilled") {
      const chartData = chartJson.value as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } };
      const meta = chartData?.chart?.result?.[0]?.meta;
      currentPrice =
        num(meta?.regularMarketPrice) ??
        num(meta?.chartPreviousClose);
    }

    const sharesOut = num(keyStats.sharesOutstanding) ?? num(price.sharesOutstanding);
    const marketCap = num(price.marketCap) ?? num(summDetail.marketCap);

    // Free cash flow: prefer financialData.freeCashflow, else derive from CF stmt
    let fcf = num(finData.freeCashflow);
    if (fcf === undefined && cfHist.length > 0) {
      const latest = cfHist[0] as Record<string, unknown>;
      const ocf   = num(latest.totalCashFromOperatingActivities);
      const capex = num(latest.capitalExpenditures) ?? 0; // usually negative
      if (ocf !== undefined) fcf = ocf + capex;
    }

    // Net debt from latest balance sheet
    let netDebt: number | undefined;
    if (bsHist.length > 0) {
      const latest    = bsHist[0] as Record<string, unknown>;
      const totalDebt = num(finData.totalDebt) ??
        ((num(latest.shortLongTermDebt) ?? 0) + (num(latest.longTermDebt) ?? 0));
      const cash      = num(latest.cash) ?? num(latest.shortTermInvestments) ?? 0;
      netDebt = totalDebt - cash;
    } else {
      const totalDebt = num(finData.totalDebt);
      const cash      = num(finData.totalCash);
      if (totalDebt !== undefined && cash !== undefined) netDebt = totalDebt - cash;
    }

    const output: FetchResult = {
      success:            true,
      company_name:       (price.longName || price.shortName || ticker) as string,
      current_price:      currentPrice,
      shares_outstanding: sharesOut !== undefined ? sharesOut / 1_000_000 : undefined,
      free_cash_flow:     fcf       !== undefined ? fcf / 1_000_000       : undefined,
      industry:           (profile.industry || profile.sector || "Industrials") as string,
      market_cap:         marketCap !== undefined ? marketCap / 1_000_000  : undefined,
      currency:           price.currency as string | undefined,
      net_debt:           netDebt !== undefined ? netDebt / 1_000_000     : undefined,
      beta:               num(keyStats.beta) ?? num(summDetail.beta),
    };

    return jsonResponse(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[fetch-live-data]", message);
    return jsonResponse({ success: false, error: message });
  }
});
