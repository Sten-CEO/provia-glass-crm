// Extended types for quotes and invoices (V2)
export interface DocumentLine {
  id: string;
  productId?: string;
  ref?: string;
  label: string;
  description?: string;
  qty: number;
  unit: string;
  unitPriceHT: number;
  vatRate: number;
  discountPct?: number;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  inventory_item_id?: string; // Link to inventory
}

export interface DocumentTotals {
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  globalDiscountPct?: number;
  depositAmount?: number;
}

export interface DocumentAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export type DocumentStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "invoiced"
  | "paid"
  | "partially_paid"
  | "cancelled";

export interface QuoteInvoiceDocument {
  id?: string;
  number: string;
  status: DocumentStatus;
  issueDate: string;
  dueDate?: string; // For invoices
  validUntil?: string; // For quotes
  clientId?: string;
  clientName: string;
  siteAddress?: DocumentAddress;
  billingAddress?: DocumentAddress;
  lines: DocumentLine[];
  totals: DocumentTotals;
  attachments?: string[];
  theme?: string;
  notesInternal?: string;
  notesClient?: string;
  terms?: string;
  linkedJobId?: string;
  linkedRequestId?: string;
  extra?: Record<string, any>; // Catch-all for additional fields
}

export const DOCUMENT_UNITS = ["unité", "m²", "m", "h", "j", "forfait", "lot"];
export const VAT_RATES = [0, 5.5, 10, 20];
