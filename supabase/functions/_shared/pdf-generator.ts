/**
 * PDF Generator Utility
 *
 * Génère des PDFs pour les devis et factures en utilisant les templates HTML
 * et en les convertant en PDF via une API tierce ou via le rendu HTML
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface QuoteData {
  id: string;
  numero: string;
  client_nom: string;
  total_ht?: number;
  total_ttc?: number;
  lignes?: any[];
  [key: string]: any;
}

interface InvoiceData {
  id: string;
  numero: string;
  client_nom: string;
  total_ht?: number;
  total_ttc?: number;
  lignes?: any[];
  [key: string]: any;
}

/**
 * Génère un PDF HTML simple pour un devis
 * TODO: Améliorer avec un vrai générateur PDF ou utiliser les templates existants
 */
export async function generateQuotePDF(
  quote: QuoteData,
  supabase: SupabaseClient
): Promise<{ buffer: Uint8Array; filename: string }> {
  // Pour le moment, on retourne un HTML simple converti en "PDF"
  // Dans une vraie implémentation, utiliser puppeteer, playwright ou une API comme PDF.co

  const html = generateQuoteHTML(quote);

  // Convertir le HTML en buffer (UTF-8)
  const buffer = new TextEncoder().encode(html);

  const filename = `Devis_${quote.numero}.pdf`;

  return { buffer, filename };
}

/**
 * Génère un PDF HTML simple pour une facture
 */
export async function generateInvoicePDF(
  invoice: InvoiceData,
  supabase: SupabaseClient
): Promise<{ buffer: Uint8Array; filename: string }> {
  const html = generateInvoiceHTML(invoice);
  const buffer = new TextEncoder().encode(html);
  const filename = `Facture_${invoice.numero}.pdf`;

  return { buffer, filename };
}

/**
 * Génère le HTML pour un devis
 */
function generateQuoteHTML(quote: QuoteData): string {
  const lines = (quote.lignes || [])
    .map((line: any) => {
      const description = line.name || line.description || '';
      const qty = line.qty || line.quantite || 1;
      const price = line.unit_price_ht || line.prix_unitaire || 0;
      const total = qty * price;

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${description}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toFixed(2)} €</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${total.toFixed(2)} €</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Devis ${quote.numero}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #333; }
    .info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background-color: #4A90E2; color: white; padding: 10px; text-align: left; }
    .totals { text-align: right; margin-top: 20px; }
    .totals div { margin: 5px 0; }
    .total-ttc { font-size: 18px; font-weight: bold; color: #4A90E2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DEVIS</h1>
    <p>N° ${quote.numero}</p>
  </div>

  <div class="info">
    <p><strong>Client:</strong> ${quote.client_nom}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="width: 100px; text-align: center;">Quantité</th>
        <th style="width: 120px; text-align: right;">Prix unit. HT</th>
        <th style="width: 120px; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lines}
    </tbody>
  </table>

  <div class="totals">
    <div><strong>Total HT:</strong> ${(quote.total_ht || 0).toFixed(2)} €</div>
    <div><strong>TVA 20%:</strong> ${(((quote.total_ttc || 0) - (quote.total_ht || 0)) || 0).toFixed(2)} €</div>
    <div class="total-ttc"><strong>Total TTC:</strong> ${(quote.total_ttc || 0).toFixed(2)} €</div>
  </div>

  <div style="margin-top: 40px; font-size: 12px; color: #666;">
    <p>Ce devis est valable 30 jours à compter de sa date d'émission.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Génère le HTML pour une facture
 */
function generateInvoiceHTML(invoice: InvoiceData): string {
  const lines = (invoice.lignes || [])
    .map((line: any) => {
      const description = line.description || '';
      const qty = line.quantite || 1;
      const price = line.prix_unitaire || 0;
      const total = line.total || (qty * price);

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${description}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toFixed(2)} €</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${total.toFixed(2)} €</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Facture ${invoice.numero}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #333; }
    .info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background-color: #E74C3C; color: white; padding: 10px; text-align: left; }
    .totals { text-align: right; margin-top: 20px; }
    .totals div { margin: 5px 0; }
    .total-ttc { font-size: 18px; font-weight: bold; color: #E74C3C; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FACTURE</h1>
    <p>N° ${invoice.numero}</p>
  </div>

  <div class="info">
    <p><strong>Client:</strong> ${invoice.client_nom}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="width: 100px; text-align: center;">Quantité</th>
        <th style="width: 120px; text-align: right;">Prix unit. HT</th>
        <th style="width: 120px; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lines}
    </tbody>
  </table>

  <div class="totals">
    <div><strong>Total HT:</strong> ${(invoice.total_ht || 0).toFixed(2)} €</div>
    <div><strong>TVA 20%:</strong> ${(((invoice.total_ttc || 0) - (invoice.total_ht || 0)) || 0).toFixed(2)} €</div>
    <div class="total-ttc"><strong>Total TTC:</strong> ${(invoice.total_ttc || 0).toFixed(2)} €</div>
  </div>

  <div style="margin-top: 40px; font-size: 12px; color: #666;">
    <p>Facture à régler sous 30 jours. Pénalités de retard: 3 fois le taux d'intérêt légal.</p>
  </div>
</body>
</html>
  `.trim();
}
