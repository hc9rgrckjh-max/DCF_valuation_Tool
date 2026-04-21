export const formatNumber = (num: number | null | undefined, decimals = 2): string => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  return num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const formatCurrency = (num: number | null | undefined, decimals = 2): string => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  return "€" + formatNumber(num, decimals);
};

export const formatMillions = (num: number | null | undefined, decimals = 0): string => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  return "€" + formatNumber(num, decimals) + "M";
};

export const formatBillions = (num: number | null | undefined, decimals = 2): string => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  return "€" + formatNumber(num / 1000, decimals) + "B";
};

export const formatPercent = (num: number | null | undefined, decimals = 1): string => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  return formatNumber(num, decimals) + "%";
};
