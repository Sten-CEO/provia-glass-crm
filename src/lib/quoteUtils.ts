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
  let total_ht = 0;
  let total_tva = 0;

  // Sum regular lines (exclude optional lines not included)
  lines.forEach((line) => {
    if (!line.optional || line.included) {
      const line_ht = line.qty * line.unit_price_ht;
      const line_tva = line_ht * (line.tva_rate / 100);
      total_ht += line_ht;
      total_tva += line_tva;
    }
  });

  // Sum selected packages
  packages
    .filter((pkg) => pkg.selected)
    .forEach((pkg) => {
      pkg.lines.forEach((line) => {
        const line_ht = line.qty * line.unit_price_ht;
        const line_tva = line_ht * (line.tva_rate / 100);
        total_ht += line_ht;
        total_tva += line_tva;
      });
    });

  // Apply discount
  const discounted_ht = Math.max(0, total_ht - discount_ht);
  
  // Adjust TVA proportionally
  const discount_ratio = total_ht > 0 ? discounted_ht / total_ht : 0;
  const adjusted_tva = total_tva * discount_ratio;

  const total_ttc = discounted_ht + adjusted_tva;

  return {
    total_ht: parseFloat(discounted_ht.toFixed(2)),
    total_tva: parseFloat(adjusted_tva.toFixed(2)),
    total_ttc: parseFloat(total_ttc.toFixed(2)),
  };
}

export const UNITS = ["unité", "m²", "m", "h", "j", "forfait", "lot"];
export const TVA_RATES = [0, 5.5, 10, 20];
