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
          <td style="border: 1px solid #ddd; padding: 12px;">${description}</td>
          <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${qty}</td>
          <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${price.toFixed(2)} €</td>
          <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${total.toFixed(2)} €</td>
        </tr>
      `;
    })
    .join('');

  // Format dates
  const issuedDate = quote.issued_at ? new Date(quote.issued_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  const expiryDate = quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('fr-FR') : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Devis ${quote.numero}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4A90E2;
    }
    .header h1 {
      color: #4A90E2;
      margin: 0 0 10px 0;
      font-size: 36px;
    }
    .header .numero {
      font-size: 18px;
      color: #666;
      font-weight: bold;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #4A90E2;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      color: #4A90E2;
      font-size: 16px;
    }
    .info-box p {
      margin: 5px 0;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th {
      background-color: #4A90E2;
      color: white;
      padding: 15px 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border: 1px solid #e5e7eb;
    }
    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .totals {
      text-align: right;
      margin-top: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .totals div {
      margin: 8px 0;
      font-size: 16px;
    }
    .total-ttc {
      font-size: 24px;
      font-weight: bold;
      color: #4A90E2;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #4A90E2;
    }
    .footer {
      margin-top: 50px;
      padding: 20px;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DEVIS</h1>
    <div class="numero">N° ${quote.numero}</div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Client</h3>
      <p><strong>${quote.client_nom}</strong></p>
      ${quote.clients?.email ? `<p>${quote.clients.email}</p>` : ''}
      ${quote.clients?.telephone ? `<p>Tél: ${quote.clients.telephone}</p>` : ''}
      ${quote.clients?.adresse ? `<p>${quote.clients.adresse}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Informations</h3>
      <p><strong>Date:</strong> ${issuedDate}</p>
      ${expiryDate ? `<p><strong>Valable jusqu'au:</strong> ${expiryDate}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="width: 120px; text-align: center;">Quantité</th>
        <th style="width: 150px; text-align: right;">Prix unit. HT</th>
        <th style="width: 150px; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lines || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">Aucune ligne</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div><strong>Total HT:</strong> ${(quote.total_ht || 0).toFixed(2)} €</div>
    <div><strong>TVA 20%:</strong> ${(((quote.total_ttc || 0) - (quote.total_ht || 0)) || 0).toFixed(2)} €</div>
    <div class="total-ttc"><strong>Total TTC:</strong> ${(quote.total_ttc || 0).toFixed(2)} €</div>
  </div>

  <div class="footer">
    <p>Ce devis est valable 30 jours à compter de sa date d'émission.</p>
    ${quote.companies?.name ? `<p style="margin-top: 10px;"><strong>${quote.companies.name}</strong></p>` : ''}
    ${quote.companies?.adresse ? `<p>${quote.companies.adresse}</p>` : ''}
    ${quote.companies?.telephone ? `<p>Tél: ${quote.companies.telephone}</p>` : ''}
    ${quote.companies?.email ? `<p>Email: ${quote.companies.email}</p>` : ''}
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
