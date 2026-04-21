// Yahoo Finance backed live data fetch. No API key required.
// Calls Yahoo's public JSON endpoints (quoteSummary + chart) directly from Deno.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FetchResult {
  success: boolean;
  error?: string;
  company_name?: string;
  current_price?: number;
  shares_outstanding?: number; // millions
  free_cash_flow?: number; // millions
  industry?: string;
  market_cap?: number; // millions
  currency?: string;
  net_debt?: number; // millions
  beta?: number;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const yahooFetch = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "application/json,text/plain,*/*",
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${url}`);
  return await res.json();
};

const num = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in (v as Record<string, unknown>)) {
    const raw = (v as { raw: unknown }).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return undefined;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const ticker = String(body?.ticker || "").trim().toUpperCase();
    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: "ticker required" } satisfies FetchResult),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const modules = [
      "price",
      "summaryDetail",
      "defaultKeyStatistics",
      "summaryProfile",
      "financialData",
      "cashflowStatementHistory",
      "balanceSheetHistory",
    ].join(",");

    const qsUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;

    const [qsJson, chartJson] = await Promise.all([
      yahooFetch(qsUrl).catch(() => null),
      yahooFetch(chartUrl).catch(() => null),
    ]);

    const result0 = qsJson?.quoteSummary?.result?.[0];
    if (!result0) {
      return new Response(
        JSON.stringify({ success: false, error: `No data for ${ticker}` } satisfies FetchResult),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const price = result0.price ?? {};
    const summaryDetail = result0.summaryDetail ?? {};
    const keyStats = result0.defaultKeyStatistics ?? {};
    const profile = result0.summaryProfile ?? {};
    const financialData = result0.financialData ?? {};
    const cfHist = result0.cashflowStatementHistory?.cashflowStatements ?? [];
    const bsHist = result0.balanceSheetHistory?.balanceSheetStatements ?? [];

    // Current price: prefer regularMarketPrice, fall back to chart meta
    let currentPrice =
      num(price.regularMarketPrice) ??
      num(financialData.currentPrice) ??
      num(summaryDetail.previousClose);
    if (currentPrice === undefined) {
      const meta = chartJson?.chart?.result?.[0]?.meta;
      currentPrice = num(meta?.regularMarketPrice) ?? num(meta?.chartPreviousClose);
    }

    const sharesOut = num(keyStats.sharesOutstanding) ?? num(price.sharesOutstanding);
    const marketCap = num(price.marketCap) ?? num(summaryDetail.marketCap);

    // Free cash flow: prefer financialData.freeCashflow, else derive from latest cashflow statement
    let fcf = num(financialData.freeCashflow);
    if (fcf === undefined && cfHist.length) {
      const latest = cfHist[0];
      const ocf = num(latest.totalCashFromOperatingActivities);
      const capex = num(latest.capitalExpenditures);
      if (ocf !== undefined) fcf = ocf + (capex ?? 0); // capex usually negative
    }

    // Net debt from latest balance sheet
    let netDebt: number | undefined;
    if (bsHist.length) {
      const latest = bsHist[0];
      const shortDebt = num(latest.shortLongTermDebt) ?? 0;
      const longDebt = num(latest.longTermDebt) ?? 0;
      const cash = num(latest.cash) ?? num(latest.shortTermInvestments) ?? 0;
      const totalDebt = num(financialData.totalDebt) ?? shortDebt + longDebt;
      netDebt = totalDebt - cash;
    } else {
      const totalDebt = num(financialData.totalDebt);
      const cash = num(financialData.totalCash);
      if (totalDebt !== undefined && cash !== undefined) netDebt = totalDebt - cash;
    }

    const result: FetchResult = {
      success: true,
      company_name: price.longName || price.shortName || ticker,
      current_price: currentPrice,
      shares_outstanding: sharesOut !== undefined ? sharesOut / 1_000_000 : undefined,
      free_cash_flow: fcf !== undefined ? fcf / 1_000_000 : undefined,
      industry: profile.industry || profile.sector || "Industrials",
      market_cap: marketCap !== undefined ? marketCap / 1_000_000 : undefined,
      currency: price.currency,
      net_debt: netDebt !== undefined ? netDebt / 1_000_000 : undefined,
      beta: num(keyStats.beta) ?? num(summaryDetail.beta),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message } satisfies FetchResult),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
