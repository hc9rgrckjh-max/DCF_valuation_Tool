export interface DCFInputs {
  companyName: string;
  industry: string;
  currentPrice: number;
  sharesOutstanding: number; // millions
  baseFCF: number; // €M
  fcfGrowthRate: number; // %
  wacc: number; // %
  terminalGrowthRate: number; // %
  netDebt: number; // €M
  riskFreeRate: number;
  beta: number;
  equityRiskPremium: number;
  costOfDebt: number;
  taxRate: number;
  equityWeight: number;
  useWaccDecomposition: boolean;
  useMidYear: boolean;
}

export interface WACCResult {
  wacc: number;
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  debtWeight: number;
}

export const calculateWACC = (i: DCFInputs): WACCResult => {
  const costOfEquity = i.riskFreeRate + i.beta * i.equityRiskPremium;
  const afterTaxCostOfDebt = i.costOfDebt * (1 - i.taxRate / 100);
  const eW = i.equityWeight / 100;
  const dW = 1 - eW;
  const wacc = eW * costOfEquity + dW * afterTaxCostOfDebt;
  return { wacc, costOfEquity, afterTaxCostOfDebt, debtWeight: dW * 100 };
};

export interface YearRow {
  year: number;
  fcf: number;
  discountFactor: number;
  pvFCF: number;
}

export interface DCFResult {
  rows: YearRow[];
  sumPV: number;
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  upsideDownside: number;
  verdict: "UNDERVALUED" | "OVERVALUED" | "FAIRLY_VALUED";
  wacc: number;
  terminalGrowthRate: number;
  useMidYear: boolean;
}

export const calculateDCF = (i: DCFInputs): DCFResult | null => {
  if (i.terminalGrowthRate >= i.wacc) return null;
  const t = i.useMidYear ? 0.5 : 0;
  const wacc = i.wacc / 100;
  const g = i.fcfGrowthRate / 100;
  const tgr = i.terminalGrowthRate / 100;

  const rows: YearRow[] = [];
  for (let y = 1; y <= 5; y++) {
    const fcf = i.baseFCF * Math.pow(1 + g, y);
    const exp = y - t;
    const df = Math.pow(1 + wacc, exp);
    rows.push({ year: y, fcf, discountFactor: 1 / df, pvFCF: fcf / df });
  }
  const sumPV = rows.reduce((a, r) => a + r.pvFCF, 0);
  const fcf5 = rows[4].fcf;
  const terminalValue = (fcf5 * (1 + tgr)) / (wacc - tgr);
  const tvExp = 5 - t;
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, tvExp);
  const enterpriseValue = sumPV + pvTerminalValue;
  const equityValue = enterpriseValue - i.netDebt;
  const intrinsicValuePerShare = equityValue / i.sharesOutstanding;
  const upsideDownside = ((intrinsicValuePerShare - i.currentPrice) / i.currentPrice) * 100;
  const verdict = upsideDownside > 5 ? "UNDERVALUED" : upsideDownside < -5 ? "OVERVALUED" : "FAIRLY_VALUED";
  return {
    rows,
    sumPV,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    netDebt: i.netDebt,
    equityValue,
    intrinsicValuePerShare,
    upsideDownside,
    verdict,
    wacc: i.wacc,
    terminalGrowthRate: i.terminalGrowthRate,
    useMidYear: i.useMidYear,
  };
};

export interface SensitivityCell {
  wacc: number;
  tgr: number;
  intrinsicValue: number | null;
  diffPct: number | null;
  isBase: boolean;
}

export const generateSensitivityGrid = (i: DCFInputs): SensitivityCell[][] => {
  const waccs = [i.wacc - 1, i.wacc - 0.5, i.wacc, i.wacc + 0.5, i.wacc + 1];
  const tgrs = [i.terminalGrowthRate - 0.5, i.terminalGrowthRate - 0.25, i.terminalGrowthRate, i.terminalGrowthRate + 0.25, i.terminalGrowthRate + 0.5];
  return waccs.map((w) =>
    tgrs.map((g) => {
      if (w <= g) return { wacc: w, tgr: g, intrinsicValue: null, diffPct: null, isBase: false };
      const r = calculateDCF({ ...i, wacc: w, terminalGrowthRate: g });
      const iv = r?.intrinsicValuePerShare ?? null;
      const diff = iv !== null ? ((iv - i.currentPrice) / i.currentPrice) * 100 : null;
      return { wacc: w, tgr: g, intrinsicValue: iv, diffPct: diff, isBase: w === i.wacc && g === i.terminalGrowthRate };
    })
  );
};

export const getSensitivityColor = (diff: number | null): string => {
  if (diff === null) return "bg-muted text-muted-foreground";
  if (diff > 30) return "bg-green-700 text-white";
  if (diff > 15) return "bg-green-600 text-white";
  if (diff > 5) return "bg-green-500 text-white";
  if (diff >= -5) return "bg-zinc-500 text-white";
  if (diff >= -15) return "bg-red-400 text-white";
  if (diff >= -30) return "bg-red-500 text-white";
  return "bg-red-700 text-white";
};
