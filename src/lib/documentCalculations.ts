// Calculation utilities for quotes and invoices
import { DocumentLine, DocumentTotals } from "@/types/documents";

export function calculateLineTotal(line: Partial<DocumentLine>): {
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
} {
  const qty = line.qty || 0;
  const unitPrice = line.unitPriceHT || 0;
  const discount = line.discountPct || 0;
  const vatRate = line.vatRate || 0;

  const totalHT = qty * unitPrice * (1 - discount / 100);
  const totalVAT = totalHT * (vatRate / 100);
  const totalTTC = totalHT + totalVAT;

  return {
    totalHT: Number(totalHT.toFixed(2)),
    totalVAT: Number(totalVAT.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
  };
}

export function calculateDocumentTotals(
  lines: DocumentLine[],
  globalDiscountPct: number = 0,
  depositAmount: number = 0
): DocumentTotals {
  // Group lines by VAT rate for breakdown
  const vatGroups = new Map<number, { baseHT: number; vatAmount: number }>();
  
  lines.forEach((line) => {
    const rate = line.vatRate;
    const existing = vatGroups.get(rate) || { baseHT: 0, vatAmount: 0 };
    vatGroups.set(rate, {
      baseHT: existing.baseHT + line.totalHT,
      vatAmount: existing.vatAmount + line.totalVAT,
    });
  });

  // Sum all line totals
  const subtotalHT = lines.reduce((sum, line) => sum + line.totalHT, 0);
  const subtotalVAT = lines.reduce((sum, line) => sum + line.totalVAT, 0);

  // Apply global discount on HT
  const discountAmount = subtotalHT * (globalDiscountPct / 100);
  const totalHT = subtotalHT - discountAmount;

  // Recalculate VAT proportionally for each rate
  const vatRatio = subtotalHT > 0 ? totalHT / subtotalHT : 1;
  const totalVAT = subtotalVAT * vatRatio;

  // Build VAT breakdown with adjusted amounts
  const vatBreakdown = Array.from(vatGroups.entries())
    .map(([rate, amounts]) => ({
      rate,
      baseHT: Number((amounts.baseHT * vatRatio).toFixed(2)),
      vatAmount: Number((amounts.vatAmount * vatRatio).toFixed(2)),
    }))
    .sort((a, b) => b.rate - a.rate);

  const totalTTC = totalHT + totalVAT;

  return {
    totalHT: Number(totalHT.toFixed(2)),
    totalVAT: Number(totalVAT.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
    globalDiscountPct,
    depositAmount,
    vatBreakdown,
  };
}

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} €`;
}
