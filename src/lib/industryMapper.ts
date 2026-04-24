/**
 * Maps raw Yahoo Finance industry/sector strings to the fixed INDUSTRY_KEYS
 * used by the DCF tool's Select dropdown.
 */

import { INDUSTRY_KEYS } from "@/lib/constants";

type IndustryKey = (typeof INDUSTRY_KEYS)[number];

/** * Lower-cased keyword fragments → canonical bucket.
 * L'ordine è importante: le categorie più specifiche o "pesanti" (come Technology) 
 * dovrebbero stare in alto.
 */
const RULES: Array<{ keywords: string[]; bucket: IndustryKey }> = [
  {
    keywords: [
      "software", "technology", "semiconductor", "tech", "internet",
      "electronic", "electronics", "computer", "hardware", "telecom", 
      "communication", "information", "it service", "data processing", 
      "cloud", "ai", "artificial intelligence", "cybersecurity",
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

  // Cerchiamo una corrispondenza nelle regole
  for (const { keywords, bucket } of RULES) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return bucket;
    }
  }

  // Se è un ticker tecnologico che è sfuggito (es. semiconduttori specifici), 
  // facciamo un ultimo controllo manuale o usiamo Industrials come fallback.
  return "Industrials"; 
}
