/**
 * Quote Matching & Tax Normalization Service
 * Handles fuzzy matching of vendor item descriptions against Indent items
 * and normalizes tax structures (Inclusive vs Exclusive GST).
 */

export interface IndentItemRef {
  id: string;
  itemName: string;
  brandMake: string;
  unit: string;
  qty: number;
}

export interface ExtractedVendorQuoteItem {
  rawDescription: string;
  matchedIndentItemId: string | null;
  confidenceScore: number; // 0 to 100
  baseRate: number;
  gstPercent: number;
  isTaxInclusive: boolean;
  calculatedBaseRate: number;
  calculatedGstAmount: number;
  calculatedLandedAmount: number;
  remarks?: string;
}

export interface ExtractedVendorQuote {
  vendorName: string;
  vendorGstin?: string;
  freightTerms?: string;
  paymentTerms?: string;
  taxTerms?: string;
  items: ExtractedVendorQuoteItem[];
}

/**
 * Tokenize string and normalize whitespace, punctuation, and casing
 */
function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Calculate Jaccard similarity index based on token set overlap
 */
function calculateTokenOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection++;
  });

  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Calculate Levenshtein similarity (0 to 1)
 */
function calculateLevenshteinSimilarity(strA: string, strB: string): number {
  const a = strA.toLowerCase().trim();
  const b = strB.toLowerCase().trim();
  if (a === b) return 1.0;
  if (!a || !b) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

/**
 * Match a raw vendor item description against available Indent items
 */
export function matchItemToIndent(
  rawDescription: string,
  indentItems: IndentItemRef[]
): { bestMatchId: string | null; confidenceScore: number } {
  if (!rawDescription || indentItems.length === 0) {
    return { bestMatchId: null, confidenceScore: 0 };
  }

  const rawTokens = tokenize(rawDescription);
  let bestScore = 0;
  let bestMatchId: string | null = null;

  for (const item of indentItems) {
    const itemTokens = tokenize(`${item.itemName} ${item.brandMake}`);
    
    // 1. Token overlap score
    const tokenScore = calculateTokenOverlap(rawTokens, itemTokens);

    // 2. Levenshtein string similarity
    const levScore = calculateLevenshteinSimilarity(rawDescription, item.itemName);

    // 3. Exact substring boost
    const normRaw = rawDescription.toLowerCase();
    const normItem = item.itemName.toLowerCase();
    const substringBoost = normRaw.includes(normItem) || normItem.includes(normRaw) ? 0.25 : 0;

    // Combined score calculation (scaled to 100)
    let combinedScore = Math.round((tokenScore * 0.5 + levScore * 0.5 + substringBoost) * 100);
    combinedScore = Math.min(100, Math.max(0, combinedScore));

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatchId = item.id;
    }
  }

  // Threshold check: If match score is below 35%, don't force auto-assignment
  if (bestScore < 35) {
    return { bestMatchId: null, confidenceScore: bestScore };
  }

  return { bestMatchId, confidenceScore: bestScore };
}

/**
 * Compute normalized tax amounts based on rate and tax mode
 */
export function normalizeTaxRates(
  rate: number,
  gstPercent: number,
  isTaxInclusive: boolean,
  qty: number = 1
): {
  baseRate: number;
  gstAmount: number;
  landedRate: number;
  totalLandedAmount: number;
} {
  const taxRate = Math.max(0, gstPercent || 0);
  const validQty = Math.max(1, qty || 1);

  if (isTaxInclusive && taxRate > 0) {
    // Landed rate is the quoted rate
    const landedRate = rate;
    const baseRate = landedRate / (1 + taxRate / 100);
    const gstAmount = landedRate - baseRate;
    return {
      baseRate: Number(baseRate.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      landedRate: Number(landedRate.toFixed(2)),
      totalLandedAmount: Number((landedRate * validQty).toFixed(2)),
    };
  } else {
    // Exclusive rate
    const baseRate = rate;
    const gstAmount = baseRate * (taxRate / 100);
    const landedRate = baseRate + gstAmount;
    return {
      baseRate: Number(baseRate.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      landedRate: Number(landedRate.toFixed(2)),
      totalLandedAmount: Number((landedRate * validQty).toFixed(2)),
    };
  }
}

/**
 * Process raw extracted items and map them against indent items with normalized tax rates
 */
export function normalizeAndMatchQuoteItems(
  rawQuoteItems: Array<{
    description: string;
    rate: number;
    gstPercent?: number;
    isInclusive?: boolean;
    remarks?: string;
  }>,
  indentItems: IndentItemRef[]
): ExtractedVendorQuoteItem[] {
  return rawQuoteItems.map((q) => {
    const { bestMatchId, confidenceScore } = matchItemToIndent(q.description, indentItems);
    const gstPct = q.gstPercent !== undefined ? q.gstPercent : 18;
    const isInc = Boolean(q.isInclusive);
    
    // Find target item qty for total calculation
    const matchedItem = indentItems.find((i) => i.id === bestMatchId);
    const itemQty = matchedItem?.qty || 1;

    const norm = normalizeTaxRates(q.rate, gstPct, isInc, itemQty);

    return {
      rawDescription: q.description,
      matchedIndentItemId: bestMatchId,
      confidenceScore,
      baseRate: q.rate,
      gstPercent: gstPct,
      isTaxInclusive: isInc,
      calculatedBaseRate: norm.baseRate,
      calculatedGstAmount: norm.gstAmount,
      calculatedLandedAmount: norm.totalLandedAmount,
      remarks: q.remarks,
    };
  });
}
