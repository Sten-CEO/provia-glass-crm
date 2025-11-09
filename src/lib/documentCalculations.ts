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
  // Sum all line totals
  const subtotalHT = lines.reduce((sum, line) => sum + line.totalHT, 0);
  const subtotalVAT = lines.reduce((sum, line) => sum + line.totalVAT, 0);

  // Apply global discount on HT
  const discountAmount = subtotalHT * (globalDiscountPct / 100);
  const totalHT = subtotalHT - discountAmount;

  // Recalculate VAT proportionally
  const vatRatio = subtotalHT > 0 ? totalHT / subtotalHT : 1;
  const totalVAT = subtotalVAT * vatRatio;

  const totalTTC = totalHT + totalVAT;

  return {
    totalHT: Number(totalHT.toFixed(2)),
    totalVAT: Number(totalVAT.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
    globalDiscountPct,
    depositAmount,
  };
}

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} €`;
}
