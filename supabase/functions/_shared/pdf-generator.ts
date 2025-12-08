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
 * Utilise le template doc_templates si fourni, sinon utilise le template par défaut
 */
export async function generateQuotePDF(
  quote: QuoteData,
  supabase: SupabaseClient
): Promise<{ buffer: Uint8Array; filename: string }> {
  // Récupérer le template si template_id est fourni
  let template = null;
  if (quote.template_id) {
    const { data, error } = await supabase
      .from('doc_templates')
      .select('*')
      .eq('id', quote.template_id)
      .single();

    if (!error && data) {
      template = data;
    }
  }

  const html = template ? generateQuoteHTMLWithTemplate(quote, template) : generateQuoteHTML(quote);

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
 * Remplace les variables dans un template
 */
function replaceTemplateVariables(text: string, quote: QuoteData): string {
  if (!text) return '';

  const issuedDate = quote.issued_at ? new Date(quote.issued_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  const expiryDate = quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('fr-FR') : '';

  return text
    .replace(/{company_name}/g, quote.companies?.name || 'Provia Glass')
    .replace(/{client_name}/g, quote.client_nom || 'Client')
    .replace(/{document_number}/g, quote.numero || '')
    .replace(/{total_ht}/g, `${(quote.total_ht || 0).toFixed(2)} €`)
    .replace(/{total_ttc}/g, `${(quote.total_ttc || 0).toFixed(2)} €`)
    .replace(/{date}/g, issuedDate)
    .replace(/{due_date}/g, expiryDate)
    .replace(/{property_address}/g, quote.property_address || quote.clients?.adresse || '')
    .replace(/{contact_phone}/g, quote.contact_phone || quote.clients?.telephone || '')
    .replace(/{contact_email}/g, quote.contact_email || quote.clients?.email || '')
    .replace(/{document_type}/g, 'Devis');
}

/**
 * Génère le HTML pour un devis avec un template personnalisé
 */
function generateQuoteHTMLWithTemplate(quote: QuoteData, template: any): string {
  const lines = (quote.lignes || [])
    .map((line: any) => {
      const description = line.name || line.description || '';
      const qty = line.qty || line.quantite || 1;
      const price = line.unit_price_ht || line.prix_unitaire || 0;
      const tvaRate = line.tva_rate || 20;
      const total = qty * price;

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500;">${description}</div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${price.toFixed(2)} €</td>
          ${template.show_vat ? `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${tvaRate}%</td>` : ''}
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${total.toFixed(2)} €</td>
        </tr>
      `;
    })
    .join('');

  const issuedDate = quote.issued_at ? new Date(quote.issued_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  const expiryDate = quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('fr-FR') : '';

  // Check if quote is signed
  const signature = quote.quote_signatures && quote.quote_signatures.length > 0 ? quote.quote_signatures[0] : null;
  const signatureDate = signature?.signed_at ? new Date(signature.signed_at).toLocaleDateString('fr-FR') : '';
  const signerName = signature?.signer_name || '';
  const signatureImage = signature?.signature_image_url || '';

  const mainColor = template.main_color || '#3b82f6';
  const fontFamily = template.font_family || 'Arial, sans-serif';

  const logoSizeStyle = template.logo_size === 'small' ? 'height: 48px;' : template.logo_size === 'large' ? 'height: 96px;' : 'height: 64px;';
  const logoAlign = template.logo_position === 'center' ? 'center' : template.logo_position === 'right' ? 'right' : 'left';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Devis ${quote.numero}</title>
  <style>
    body {
      font-family: ${fontFamily};
      color: #1a1a1a;
      margin: 0;
      padding: 40px;
      line-height: 1.6;
    }
    ${template.css || ''}
  </style>
</head>
<body>
  ${template.header_logo ? `
    <div style="text-align: ${logoAlign}; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
      <img src="${template.header_logo}" alt="Logo" style="${logoSizeStyle} object-fit: contain;" />
    </div>
  ` : ''}

  ${template.header_html ? `
    <div class="header" style="margin-bottom: 24px;">
      ${replaceTemplateVariables(template.header_html, quote)}
    </div>
  ` : ''}

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px;">
    <div>
      <p style="font-weight: 600; font-size: 18px; margin: 0 0 8px 0; color: ${mainColor};">DEVIS</p>
      <p style="font-weight: 600; margin: 4px 0;">N° ${quote.numero}</p>
      <p style="margin: 4px 0;">Date: ${issuedDate}</p>
      ${expiryDate ? `<p style="margin: 4px 0;">Valable jusqu'au: ${expiryDate}</p>` : ''}
    </div>
    <div style="text-align: right;">
      <p style="font-weight: 600; margin: 0 0 8px 0;">Client</p>
      <p style="font-weight: 500; margin: 4px 0;">${quote.client_nom}</p>
      ${quote.property_address || quote.clients?.adresse ? `<p style="margin: 4px 0;">${quote.property_address || quote.clients?.adresse}</p>` : ''}
      ${quote.contact_phone || quote.clients?.telephone ? `<p style="margin: 4px 0;">${quote.contact_phone || quote.clients?.telephone}</p>` : ''}
      ${quote.contact_email || quote.clients?.email ? `<p style="margin: 4px 0;">${quote.contact_email || quote.clients?.email}</p>` : ''}
    </div>
  </div>

  ${quote.title ? `<div style="margin-bottom: 16px;"><h2 style="font-size: 18px; font-weight: 600;">${quote.title}</h2></div>` : ''}

  ${template.content_html ? `
    <div class="content" style="margin-bottom: 24px;">
      ${replaceTemplateVariables(template.content_html, quote)}
    </div>
  ` : `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="border-bottom: 2px solid ${mainColor};">
            <th style="text-align: left; padding: 8px; color: ${mainColor};">Description</th>
            <th style="text-align: center; padding: 8px; color: ${mainColor};">Qté</th>
            <th style="text-align: right; padding: 8px; color: ${mainColor};">P.U. HT</th>
            ${template.show_vat ? `<th style="text-align: center; padding: 8px; color: ${mainColor};">TVA</th>` : ''}
            <th style="text-align: right; padding: 8px; color: ${mainColor};">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${lines || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">Aucune ligne</td></tr>'}
        </tbody>
      </table>
    </div>
  `}

  <div style="font-size: 14px; margin-bottom: 24px;">
    <div style="display: flex; justify-content: flex-end; margin: 4px 0;">
      <span style="width: 150px;">Total HT:</span>
      <span style="font-weight: 600; width: 120px; text-align: right;">${(quote.total_ht || 0).toFixed(2)} €</span>
    </div>
    ${template.show_discounts && quote.remise > 0 ? `
      <div style="display: flex; justify-content: flex-end; margin: 4px 0; color: #16a34a;">
        <span style="width: 150px;">Remise:</span>
        <span style="width: 120px; text-align: right;">-${(quote.remise || 0).toFixed(2)} €</span>
      </div>
    ` : ''}
    ${template.show_vat ? `
      <div style="display: flex; justify-content: flex-end; margin: 4px 0;">
        <span style="width: 150px;">TVA:</span>
        <span style="width: 120px; text-align: right;">${((quote.total_ttc || 0) - (quote.total_ht || 0)).toFixed(2)} €</span>
      </div>
    ` : ''}
    <div style="display: flex; justify-content: flex-end; margin: 8px 0 0 0; padding-top: 8px; border-top: 2px solid ${mainColor}; font-size: 18px; font-weight: bold; color: ${mainColor};">
      <span style="width: 150px;">Total TTC:</span>
      <span style="width: 120px; text-align: right;">${(quote.total_ttc || 0).toFixed(2)} €</span>
    </div>
    ${quote.required_deposit_ht > 0 ? `
      <div style="display: flex; justify-content: flex-end; margin: 4px 0; color: #ea580c; font-weight: 600;">
        <span style="width: 150px;">Acompte requis:</span>
        <span style="width: 120px; text-align: right;">${(quote.required_deposit_ht || 0).toFixed(2)} €</span>
      </div>
    ` : ''}
  </div>

  ${quote.client_message || quote.message_client ? `
    <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
      <p style="font-size: 14px; white-space: pre-wrap; margin: 0;">${quote.client_message || quote.message_client}</p>
    </div>
  ` : ''}

  ${quote.conditions || quote.notes_legal ? `
    <div style="margin-top: 24px; font-size: 12px; color: #6b7280;">
      <p style="white-space: pre-wrap; margin: 0;">${quote.conditions || quote.notes_legal}</p>
    </div>
  ` : ''}

  ${template.footer_html ? `
    <div class="footer" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      ${replaceTemplateVariables(template.footer_html, quote)}
    </div>
  ` : ''}

  ${template.signature_enabled ? `
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 14px; font-weight: 600; margin-bottom: 16px;">Bon pour accord</p>
      ${signatureImage && signatureDate ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
          <div>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Date et signature du client:</p>
            <img src="${signatureImage}" alt="Signature" style="max-width: 300px; max-height: 80px; display: block; margin-bottom: 8px;" />
            <p style="margin: 0; font-size: 12px;"><strong>${signerName}</strong></p>
            <p style="margin: 0; font-size: 12px; color: #666;">Date: ${signatureDate}</p>
          </div>
          <div>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Cachet de l'entreprise:</p>
            <div style="height: 80px; border-bottom: 1px dashed #d1d5db;"></div>
          </div>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
          <div>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Date et signature du client:</p>
            <div style="height: 80px; border-bottom: 1px dashed #d1d5db;"></div>
          </div>
          <div>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Cachet de l'entreprise:</p>
            <div style="height: 80px; border-bottom: 1px dashed #d1d5db;"></div>
          </div>
        </div>
      `}
    </div>
  ` : signatureImage && signatureDate ? `
    <!-- Signature Box (fallback when template signature is disabled) -->
    <div style="margin-top: 60px; margin-bottom: 40px;">
      <div style="border: 2px solid #333; padding: 20px; border-radius: 8px; background: #fff;">
        <div style="margin-bottom: 15px;">
          <p style="margin: 0; font-weight: bold; font-size: 14px;">Offre valable jusqu'au : ${expiryDate || '..../..../....'}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 14px;">Signature/bon pour accord :</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; min-height: 100px;">
          <div>
            <img src="${signatureImage}" alt="Signature" style="max-width: 300px; max-height: 80px; display: block;" />
            <p style="margin: 10px 0 0 0; font-size: 12px;"><strong>${signerName}</strong></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #666;">Date de signature :</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">${signatureDate}</p>
          </div>
        </div>
      </div>
    </div>
  ` : ''}
</body>
</html>
  `.trim();
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

  // Check if quote is signed
  const signature = quote.quote_signatures && quote.quote_signatures.length > 0 ? quote.quote_signatures[0] : null;
  const signatureDate = signature?.signed_at ? new Date(signature.signed_at).toLocaleDateString('fr-FR') : '';
  const signerName = signature?.signer_name || '';
  const signatureImage = signature?.signature_image_url || '';

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

  <!-- Signature Box -->
  <div style="margin-top: 60px; margin-bottom: 40px;">
    <div style="border: 2px solid #333; padding: 20px; border-radius: 8px; background: #fff;">
      <div style="margin-bottom: 15px;">
        <p style="margin: 0; font-weight: bold; font-size: 14px;">Offre valable jusqu'au : ${expiryDate || '..../..../....'}</p>
        <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 14px;">Signature/bon pour accord :</p>
      </div>
      ${signatureImage && signatureDate ? `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; min-height: 100px;">
          <div>
            <img src="${signatureImage}" alt="Signature" style="max-width: 300px; max-height: 80px; display: block;" />
            <p style="margin: 10px 0 0 0; font-size: 12px;"><strong>${signerName}</strong></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #666;">Date de signature :</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">${signatureDate}</p>
          </div>
        </div>
      ` : `
        <div style="min-height: 100px; border: 1px dashed #ccc; border-radius: 4px; background: #fafafa;"></div>
      `}
    </div>
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
