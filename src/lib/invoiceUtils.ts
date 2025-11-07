// Shared invoice totals computation
interface InvoiceLine {
  qty?: number;
  quantite?: number;
  unit_price_ht?: number;
  prix_unitaire?: number;
  tva_rate?: number;
}

export interface Invoice {
  lines?: InvoiceLine[];
  lignes?: InvoiceLine[];
  discount_ht?: number;
  remise?: number;
  total_ht?: number;
  total_ttc?: number;
  statut?: string;
  echeance?: string;
  [key: string]: any; // Allow other properties
}

export function recomputeInvoiceTotals(invoice: any): any {
  const lines = (invoice.lines || invoice.lignes || []) as InvoiceLine[];
  
  // Sum lines HT
  const sum_ht = lines.reduce((acc, line) => {
    const qty = line.qty ?? line.quantite ?? 0;
    const price = line.unit_price_ht ?? line.prix_unitaire ?? 0;
    return acc + (qty * price);
  }, 0);

  // Sum lines TTC (with per-line VAT)
  const sum_ttc = lines.reduce((acc, line) => {
    const qty = line.qty ?? line.quantite ?? 0;
    const price = line.unit_price_ht ?? line.prix_unitaire ?? 0;
    const ht = qty * price;
    const tva_rate = line.tva_rate ?? 20; // default 20% TVA
    const ttc = ht * (1 + tva_rate / 100);
    return acc + ttc;
  }, 0);

  const discount = invoice.discount_ht ?? invoice.remise ?? 0;
  
  return {
    ...invoice,
    total_ht: Math.max(0, sum_ht - discount),
    total_ttc: Math.max(0, sum_ttc - discount),
  };
}

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} €`;
}
