/**
 * Quote Template Renderer
 *
 * Source de vérité unique pour le rendu des templates de devis/factures.
 * Cette fonction génère le HTML complet d'un document basé sur un template.
 *
 * Utilisée par:
 * - TemplatePreview.tsx (preview dans l'éditeur de template)
 * - PdfPreviewModal.tsx (preview lors de la création d'un devis)
 * - pdf-generator.ts (génération du PDF final) - version Deno
 */

export interface TemplateData {
  type: 'QUOTE' | 'INVOICE';
  header_logo: string | null;
  header_layout?: 'logo-left' | 'logo-center' | 'logo-right' | 'split';
  logo_size?: 'small' | 'medium' | 'large';
  main_color: string | null;
  font_family: string | null;
  show_vat: boolean;
  show_discounts: boolean;
  show_remaining_balance: boolean;
  signature_enabled: boolean;
  header_html: string | null;
  content_html: string | null;
  footer_html: string | null;
  css: string | null;
}

export interface QuoteData {
  numero: string;
  client_nom: string;
  issued_at?: string;
  expiry_date?: string;
  total_ht: number;
  total_ttc: number;
  remise?: number;
  required_deposit_ht?: number;
  title?: string;
  client_message?: string;
  message_client?: string;
  conditions?: string;
  notes_legal?: string;
  property_address?: string;
  contact_phone?: string;
  contact_email?: string;
  lignes?: Array<{
    name?: string;
    description?: string;
    qty?: number;
    quantite?: number;
    unit_price_ht?: number;
    prix_unitaire?: number;
    tva_rate?: number;
    total?: number;
  }>;
  companies?: {
    name: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  };
  clients?: {
    nom?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  };
  quote_signatures?: Array<{
    signature_image_url?: string;
    signer_name?: string;
    signed_at?: string;
  }>;
}

/**
 * Remplace les variables du template par les vraies valeurs
 */
function replaceTemplateVariables(text: string, quote: QuoteData): string {
  if (!text) return '';

  const issuedDate = quote.issued_at
    ? new Date(quote.issued_at).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');
  const expiryDate = quote.expiry_date
    ? new Date(quote.expiry_date).toLocaleDateString('fr-FR')
    : '';
  const companyName = quote.companies?.name || 'Provia BASE';

  return text
    // English variables with single braces
    .replace(/{company_name}/g, companyName)
    .replace(/{client_name}/g, quote.client_nom || 'Client')
    .replace(/{document_number}/g, quote.numero || '')
    .replace(/{total_ht}/g, `${(quote.total_ht || 0).toFixed(2)} €`)
    .replace(/{total_ttc}/g, `${(quote.total_ttc || 0).toFixed(2)} €`)
    .replace(/{date}/g, issuedDate)
    .replace(/{due_date}/g, expiryDate)
    .replace(/{property_address}/g, quote.property_address || quote.clients?.adresse || '')
    .replace(/{contact_phone}/g, quote.contact_phone || quote.clients?.telephone || '')
    .replace(/{contact_email}/g, quote.contact_email || quote.clients?.email || '')
    .replace(/{document_type}/g, 'Devis')
    // French variables with double braces
    .replace(/\{\{NomEntreprise\}\}/g, companyName)
    .replace(/\{\{NomClient\}\}/g, quote.client_nom || 'Client')
    .replace(/\{\{EmailClient\}\}/g, quote.contact_email || quote.clients?.email || '')
    .replace(/\{\{TelephoneClient\}\}/g, quote.contact_phone || quote.clients?.telephone || '')
    .replace(/\{\{AdresseClient\}\}/g, quote.property_address || quote.clients?.adresse || '')
    .replace(/\{\{NumDevis\}\}/g, quote.numero || '')
    .replace(/\{\{NumDocument\}\}/g, quote.numero || '')
    .replace(/\{\{TypeDocument\}\}/g, 'Devis')
    .replace(/\{\{MontantHT\}\}/g, `${(quote.total_ht || 0).toFixed(2)} €`)
    .replace(/\{\{MontantTTC\}\}/g, `${(quote.total_ttc || 0).toFixed(2)} €`)
    .replace(/\{\{DateEnvoi\}\}/g, issuedDate)
    .replace(/\{\{DateCreation\}\}/g, issuedDate)
    .replace(/\{\{DateExpiration\}\}/g, expiryDate);
}

/**
 * Génère le HTML du header selon le layout configuré
 */
function generateHeaderHTML(template: TemplateData, quote: QuoteData): string {
  if (!template.header_logo) return '';

  const mainColor = template.main_color || '#3b82f6';
  const logoSizeStyle = template.logo_size === 'small'
    ? 'height: 48px;'
    : template.logo_size === 'large'
    ? 'height: 96px;'
    : 'height: 64px;';

  const logoHTML = `<img src="${template.header_logo}" alt="Logo" style="${logoSizeStyle} object-fit: contain;" />`;
  const titleHTML = `
    <div>
      <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: ${mainColor};">
        ${template.type === 'QUOTE' ? 'DEVIS' : 'FACTURE'}
      </h1>
      <p style="font-size: 14px; color: #6b7280; margin: 0;">N° ${quote.numero}</p>
    </div>
  `;

  switch (template.header_layout) {
    case 'logo-center':
      return `
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
          <div style="margin-bottom: 16px;">${logoHTML}</div>
          ${titleHTML}
        </div>
      `;
    case 'logo-right':
      return `
        <div style="display: flex; flex-direction: row-reverse; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
          <div>${logoHTML}</div>
          ${titleHTML}
        </div>
      `;
    case 'split':
      return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
          <div>${logoHTML}</div>
          ${titleHTML}
        </div>
      `;
    default: // logo-left
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
          <div>${logoHTML}</div>
          ${titleHTML}
        </div>
      `;
  }
}

/**
 * Génère le HTML du tableau des lignes
 */
function generateLinesTableHTML(template: TemplateData, quote: QuoteData): string {
  const mainColor = template.main_color || '#3b82f6';
  const lines = (quote.lignes || [])
    .map((line) => {
      const description = line.name || line.description || '';
      const qty = line.qty || line.quantite || 1;
      const price = line.unit_price_ht || line.prix_unitaire || 0;
      const tvaRate = line.tva_rate || 20;
      const total = line.total || (qty * price);

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

  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
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
  `;
}

/**
 * Génère le HTML de la section des totaux
 */
function generateTotalsHTML(template: TemplateData, quote: QuoteData): string {
  const mainColor = template.main_color || '#3b82f6';

  return `
    <div style="font-size: 14px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: flex-end; margin: 4px 0;">
        <span style="width: 150px;">Total HT:</span>
        <span style="font-weight: 600; width: 120px; text-align: right;">${(quote.total_ht || 0).toFixed(2)} €</span>
      </div>
      ${template.show_discounts && (quote.remise || 0) > 0 ? `
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
      ${(quote.required_deposit_ht || 0) > 0 ? `
        <div style="display: flex; justify-content: flex-end; margin: 4px 0; color: #ea580c; font-weight: 600;">
          <span style="width: 150px;">Acompte requis:</span>
          <span style="width: 120px; text-align: right;">${(quote.required_deposit_ht || 0).toFixed(2)} €</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Génère le HTML de la signature
 */
function generateSignatureHTML(template: TemplateData, quote: QuoteData): string {
  if (!template.signature_enabled) return '';

  const signature = quote.quote_signatures && quote.quote_signatures.length > 0
    ? quote.quote_signatures[0]
    : null;
  const signatureDate = signature?.signed_at
    ? new Date(signature.signed_at).toLocaleDateString('fr-FR')
    : '';
  const signerName = signature?.signer_name || '';
  const signatureImage = signature?.signature_image_url || '';

  if (signatureImage && signatureDate) {
    return `
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 14px; font-weight: 600; margin-bottom: 16px;">Bon pour accord</p>
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
      </div>
    `;
  } else {
    return `
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 14px; font-weight: 600; margin-bottom: 16px;">Bon pour accord</p>
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
      </div>
    `;
  }
}

/**
 * FONCTION PRINCIPALE
 * Génère le HTML complet d'un devis/facture basé sur un template
 *
 * @param template - Le template de document
 * @param quote - Les données du devis/facture
 * @returns Le HTML complet du document
 */
export function renderQuoteHTML(template: TemplateData, quote: QuoteData): string {
  const mainColor = template.main_color || '#3b82f6';
  const fontFamily = template.font_family || 'Arial, sans-serif';

  const issuedDate = quote.issued_at
    ? new Date(quote.issued_at).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');
  const expiryDate = quote.expiry_date
    ? new Date(quote.expiry_date).toLocaleDateString('fr-FR')
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${template.type === 'QUOTE' ? 'Devis' : 'Facture'} ${quote.numero}</title>
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
  ${generateHeaderHTML(template, quote)}

  ${template.header_html ? `
    <div class="header" style="margin-bottom: 24px;">
      ${replaceTemplateVariables(template.header_html, quote)}
    </div>
  ` : ''}

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px;">
    <div>
      <p style="font-weight: 600; margin: 4px 0;">Date: ${issuedDate}</p>
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
  ` : generateLinesTableHTML(template, quote)}

  ${generateTotalsHTML(template, quote)}

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

  ${generateSignatureHTML(template, quote)}
</body>
</html>
  `.trim();
}
