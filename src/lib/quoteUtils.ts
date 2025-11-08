// Quote calculation utilities

export interface QuoteLine {
  id: string;
  name: string;
  description?: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
  tva_rate: number;
  optional?: boolean;
  included?: boolean; // for optional lines
  photo_url?: string;
}

export interface QuotePackage {
  id: string;
  name: string;
  description?: string;
  lines: QuoteLine[];
  photo_url?: string;
  selected?: boolean;
}

export interface QuoteTotals {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
}

export function computeQuoteTotals(
  lines: QuoteLine[],
  packages: QuotePackage[],
  discount_ht: number = 0
): QuoteTotals {
  // Sum included lines only
  const includedLines = lines.filter(l => !l.optional || l.included === true);
  
  let sum_ht = 0;
  let sum_ttc = 0;

  includedLines.forEach((line) => {
    const line_ht = (line.qty || 0) * (line.unit_price_ht || 0);
    const rate = (line.tva_rate || 0) / 100;
    sum_ht += line_ht;
    sum_ttc += line_ht * (1 + rate);
  });

  // Sum selected packages
  packages
    .filter((pkg) => pkg.selected)
    .forEach((pkg) => {
      pkg.lines.forEach((line) => {
        const line_ht = (line.qty || 0) * (line.unit_price_ht || 0);
        const rate = (line.tva_rate || 0) / 100;
        sum_ht += line_ht;
        sum_ttc += line_ht * (1 + rate);
      });
    });

  // Apply discount
  const discount = Math.max(0, discount_ht || 0);
  const total_ht = Math.max(0, sum_ht - discount);
  const total_ttc = Math.max(0, sum_ttc - discount);
  const total_tva = total_ttc - total_ht;

  return {
    total_ht: parseFloat(total_ht.toFixed(2)),
    total_tva: parseFloat(total_tva.toFixed(2)),
    total_ttc: parseFloat(total_ttc.toFixed(2)),
  };
}

export function recomputeQuoteTotals(quote: any) {
  const totals = computeQuoteTotals(
    quote.lignes || quote.lines || [],
    quote.packages || [],
    quote.remise || quote.discount_ht || 0
  );
  return {
    ...quote,
    total_ht: totals.total_ht,
    total_ttc: totals.total_ttc,
  };
}

export const UNITS = ["unité", "m²", "m", "h", "j", "forfait", "lot"];
export const TVA_RATES = [0, 5.5, 10, 20];
