import type { DCFInputs } from "./dcf";

export const DEFAULT_INPUTS: DCFInputs = {
  companyName: "Siemens AG",
  industry: "Industrials",
  currentPrice: 155.0,
  sharesOutstanding: 800,
  baseFCF: 6200,
  fcfGrowthRate: 7,
  wacc: 9,
  terminalGrowthRate: 2.5,
  netDebt: 8500,
  riskFreeRate: 2.5,
  beta: 1.1,
  equityRiskPremium: 5.5,
  costOfDebt: 3.5,
  taxRate: 25,
  equityWeight: 70,
  useWaccDecomposition: true,
  useMidYear: true,
};

export const INDUSTRY_KEYS = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Goods",
  "Energy",
  "Industrials",
  "Real Estate",
] as const;

export const STORAGE = {
  THEME: "dcf-theme",
  LANG: "dcf-language",
  INPUTS: "dcf-inputs",
  SCENARIOS: "dcf-scenarios",
  MODE: "dcf-input-mode",
} as const;

export const VALIDATION = {
  WACC_LOW: 6,
  WACC_HIGH: 20,
  GROWTH_HIGH: 15,
  TGR_HIGH: 3,
  FCF_HIGH: 100000,
};
