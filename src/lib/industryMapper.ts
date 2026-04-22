/**
 * Maps raw Yahoo Finance industry/sector strings to the fixed INDUSTRY_KEYS
 * used by the DCF tool's Select dropdown.
 *
 * Yahoo Finance returns values like:
 *   "Software—Application", "Consumer Electronics", "Oil & Gas E&P",
 *   "Drug Manufacturers—General", "Banks—Diversified", "REIT—Industrial", …
 *
 * We normalize to the closest canonical bucket using keyword matching.
 * Falls back to "Industrials" if nothing matches (reasonable default).
 */

import { INDUSTRY_KEYS } from "@/lib/constants";

type IndustryKey = (typeof INDUSTRY_KEYS)[number];

/** Lower-cased keyword fragments → canonical bucket */
const RULES: Array<{ keywords: string[]; bucket: IndustryKey }> = [
  {
    keywords: [
      "software", "technology", "semiconductor", "tech", "internet",
      "electronic component", "computer", "telecom", "communication",
      "information", "it service", "data processing", "cloud", "ai",
      "artificial intelligence", "cybersecurity",
    ],
    bucket: "Technology",
  },
  {
    keywords: [
      "health", "drug", "pharma", "biotech", "medical", "hospital",
      "diagnostics", "life science", "therapeutics", "clinical",
      "healthcare plan", "managed care",
    ],
    bucket: "Healthcare",
  },
  {
    keywords: [
      "bank", "insurance", "financial", "invest", "asset management",
      "credit", "capital market", "brokerage", "mortgage", "fintech",
      "savings", "securities",
    ],
    bucket: "Financial Services",
  },
  {
    keywords: [
      "consumer", "retail", "food", "beverage", "apparel", "fashion",
      "household", "personal product", "luxury", "tobacco", "restaurant",
      "grocery", "supermarket", "e-commerce", "department store",
    ],
    bucket: "Consumer Goods",
  },
  {
    keywords: [
      "oil", "gas", "energy", "utility", "utilities", "electric",
      "power", "solar", "wind", "nuclear", "coal", "petroleum",
      "mining", "metal", "chemical",
    ],
    bucket: "Energy",
  },
  {
    keywords: [
      "industrial", "aerospace", "defense", "machinery", "manufacturing",
      "construction", "engineering", "logistics", "transport", "airline",
      "shipping", "railroad", "conglomerate",
    ],
    bucket: "Industrials",
  },
  {
    keywords: [
      "real estate", "reit", "property", "land", "building", "housing",
      "apartment", "commercial property",
    ],
    bucket: "Real Estate",
  },
];

export function mapYahooIndustry(raw: string | undefined | null): IndustryKey {
  if (!raw) return "Industrials";

  const lower = raw.toLowerCase();

  for (const { keywords, bucket } of RULES) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return bucket;
    }
  }

  return "Industrials"; // safe fallback
}
