// FMP-backed live data fetch. Returns shape used by the frontend.
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

const fmpFetch = async (path: string, apiKey: string) => {
  const url = `https://financialmodelingprep.com/api/v3/${path}${path.includes("?") ? "&" : "?"}apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP ${path} → ${res.status}`);
  return await res.json();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("FMP_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "FMP_API_KEY not configured" } satisfies FetchResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ticker = String(body?.ticker || "").trim().toUpperCase();
    if (!ticker) {
      return new Response(JSON.stringify({ success: false, error: "ticker required" } satisfies FetchResult), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parallel fetches: profile, latest cash flow (annual), latest balance sheet (annual)
    const [profileArr, cfArr, bsArr] = await Promise.all([
      fmpFetch(`profile/${ticker}`, apiKey).catch(() => []),
      fmpFetch(`cash-flow-statement/${ticker}?limit=1`, apiKey).catch(() => []),
      fmpFetch(`balance-sheet-statement/${ticker}?limit=1`, apiKey).catch(() => []),
    ]);

    const profile = Array.isArray(profileArr) && profileArr.length ? profileArr[0] : null;
    if (!profile) {
      return new Response(JSON.stringify({ success: false, error: `No data for ${ticker}` } satisfies FetchResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cf = Array.isArray(cfArr) && cfArr.length ? cfArr[0] : null;
    const bs = Array.isArray(bsArr) && bsArr.length ? bsArr[0] : null;

    const fcfRaw = cf?.freeCashFlow ?? (cf?.operatingCashFlow ?? 0) - Math.abs(cf?.capitalExpenditure ?? 0);
    const totalDebt = (bs?.totalDebt ?? (bs?.shortTermDebt ?? 0) + (bs?.longTermDebt ?? 0)) || 0;
    const cash = bs?.cashAndCashEquivalents ?? bs?.cashAndShortTermInvestments ?? 0;

    const result: FetchResult = {
      success: true,
      company_name: profile.companyName ?? ticker,
      current_price: typeof profile.price === "number" ? profile.price : undefined,
      shares_outstanding:
        typeof profile.mktCap === "number" && typeof profile.price === "number" && profile.price > 0
          ? profile.mktCap / profile.price / 1_000_000
          : undefined,
      free_cash_flow: fcfRaw ? fcfRaw / 1_000_000 : undefined,
      industry: profile.industry || profile.sector || "Industrials",
      market_cap: profile.mktCap ? profile.mktCap / 1_000_000 : undefined,
      currency: profile.currency,
      net_debt: bs ? (totalDebt - cash) / 1_000_000 : undefined,
      beta: typeof profile.beta === "number" ? profile.beta : undefined,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message } satisfies FetchResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
