/**
 * Quote HTML Renderer - Source de vérité unique pour le rendu des devis
 *
 * Ce fichier est la référence unique pour générer le HTML des devis.
 * Il est utilisé par :
 * - LivePdfPreview.tsx (aperçu dans l'éditeur de templates)
 * - PdfPreviewModal.tsx (aperçu lors de la création d'un devis)
 * - pdf-generator.ts (génération du PDF backend)
 *
 * IMPORTANT: Toute modification du rendu doit être faite ICI pour garantir
 * la cohérence entre tous les affichages.
 */

import { DocumentTemplate } from "@/hooks/useDocumentTemplates";

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteRenderData {
  // Document info
  numero: string;
  title?: string;
  issued_at?: string;
  expiry_date?: string;

  // Client info
  client_nom: string;
  client_email?: string;
  client_telephone?: string;
  client_adresse?: string;

  // Company info
  company_name?: string;
  company_email?: string;
  company_telephone?: string;
  company_adresse?: string;
  company_siret?: string;
  company_website?: string;

  // Amounts
  total_ht: number;
  total_ttc: number;
  remise?: number;
  acompte?: number;

  // Lines
  lignes: QuoteLine[];

  // Additional content
  message_client?: string;
  conditions?: string;

  // Signature (optional)
  signature?: {
    signed_at?: string;
    signer_name?: string;
    signature_image_url?: string;
  };
}

export interface QuoteLine {
  name?: string;
  description?: string;
  reference?: string;
  qty?: number;
  quantite?: number;
  unit?: string;
  unit_price_ht?: number;
  prix_unitaire?: number;
  tva_rate?: number;
  discount?: number;
  total?: number;
}

export interface QuoteRenderOptions {
  documentType?: "QUOTE" | "INVOICE";
  mode?: "preview" | "pdf" | "print";
  // Si true, utilise des classes CSS Tailwind (pour React)
  // Si false, utilise uniquement des styles inline (pour PDF backend)
  useInlineStyles?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formate un montant en devise française
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "0,00 €";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Formate une date au format français
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Remplace les variables dans un template HTML
 */
export function replaceTemplateVariables(
  text: string,
  data: QuoteRenderData
): string {
  if (!text) return "";

  const totalTVA = (data.total_ttc || 0) - (data.total_ht || 0);
  const issuedDate = formatDate(data.issued_at);
  const expiryDate = formatDate(data.expiry_date);

  return text
    // Variables françaises (doubles accolades)
    .replace(/\{\{NomEntreprise\}\}/g, data.company_name || "")
    .replace(/\{\{EmailEntreprise\}\}/g, data.company_email || "")
    .replace(/\{\{TelephoneEntreprise\}\}/g, data.company_telephone || "")
    .replace(/\{\{AdresseEntreprise\}\}/g, data.company_adresse || "")
    .replace(/\{\{SIRETEntreprise\}\}/g, data.company_siret || "")
    .replace(/\{\{SiteWebEntreprise\}\}/g, data.company_website || "")
    .replace(/\{\{NomClient\}\}/g, data.client_nom || "")
    .replace(/\{\{EmailClient\}\}/g, data.client_email || "")
    .replace(/\{\{TelephoneClient\}\}/g, data.client_telephone || "")
    .replace(/\{\{AdresseClient\}\}/g, data.client_adresse || "")
    .replace(/\{\{NumDevis\}\}/g, data.numero || "")
    .replace(/\{\{NumDocument\}\}/g, data.numero || "")
    .replace(/\{\{TypeDocument\}\}/g, "Devis")
    .replace(/\{\{MontantHT\}\}/g, formatCurrency(data.total_ht))
    .replace(/\{\{MontantTTC\}\}/g, formatCurrency(data.total_ttc))
    .replace(/\{\{MontantTVA\}\}/g, formatCurrency(totalTVA))
    .replace(/\{\{DateEnvoi\}\}/g, issuedDate)
    .replace(/\{\{DateCreation\}\}/g, issuedDate)
    .replace(/\{\{DateExpiration\}\}/g, expiryDate)
    .replace(/\{\{Remise\}\}/g, formatCurrency(data.remise))
    .replace(/\{\{Acompte\}\}/g, formatCurrency(data.acompte))
    .replace(/\{\{Conditions\}\}/g, data.conditions || "")
    // Variables anglaises (simples accolades) - rétrocompatibilité
    .replace(/\{company_name\}/g, data.company_name || "")
    .replace(/\{client_name\}/g, data.client_nom || "")
    .replace(/\{document_number\}/g, data.numero || "")
    .replace(/\{total_ht\}/g, formatCurrency(data.total_ht))
    .replace(/\{total_ttc\}/g, formatCurrency(data.total_ttc))
    .replace(/\{date\}/g, issuedDate)
    .replace(/\{due_date\}/g, expiryDate)
    .replace(/\{document_type\}/g, "Devis")
    .replace(/\{property_address\}/g, data.client_adresse || "")
    .replace(/\{contact_phone\}/g, data.client_telephone || "")
    .replace(/\{contact_email\}/g, data.client_email || "");
}

/**
 * Obtient le style de background selon le template
 */
function getBackgroundStyle(template: Partial<DocumentTemplate>): string {
  const mainColor = template.main_color || "#3b82f6";
  const accentColor = template.accent_color || "#fbbf24";

  switch (template.background_style) {
    case "gradient":
      return `background: linear-gradient(135deg, ${mainColor}10 0%, ${accentColor}10 100%);`;
    case "pattern":
      return `background-color: #f9fafb; background-image: repeating-linear-gradient(45deg, ${mainColor}05 0px, ${mainColor}05 10px, transparent 10px, transparent 20px);`;
    case "none":
      return "background: transparent;";
    default:
      return "background: white;";
  }
}

/**
 * Obtient la taille du logo en pixels
 */
function getLogoSize(size: string | null | undefined): string {
  switch (size) {
    case "small":
      return "48px";
    case "large":
      return "96px";
    default:
      return "64px";
  }
}

/**
 * Vérifie si une colonne doit être affichée
 */
function shouldShowColumn(
  template: Partial<DocumentTemplate>,
  columnKey: string
): boolean {
  if (!template.table_columns) {
    // Colonnes par défaut si non configurées
    const defaults: Record<string, boolean> = {
      description: true,
      reference: false,
      quantity: true,
      unit: false,
      unit_price_ht: true,
      vat_rate: true,
      discount: false,
      total_ht: true,
    };
    return defaults[columnKey] ?? true;
  }
  return template.table_columns[columnKey] ?? false;
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Génère le HTML complet pour un devis
 * Cette fonction est la SOURCE DE VÉRITÉ UNIQUE pour le rendu des devis.
 */
export function renderQuoteToHtml(
  data: QuoteRenderData,
  template: Partial<DocumentTemplate>,
  options: QuoteRenderOptions = {}
): string {
  const {
    documentType = "QUOTE",
    mode = "preview",
  } = options;

  const docTypeLabel = documentType === "QUOTE" ? "DEVIS" : "FACTURE";
  const mainColor = template.main_color || "#3b82f6";
  const accentColor = template.accent_color || "#fbbf24";
  const fontFamily = template.font_family || "Arial, sans-serif";
  const logoSize = getLogoSize(template.logo_size);
  const backgroundStyle = getBackgroundStyle(template);

  const issuedDate = formatDate(data.issued_at) || formatDate(new Date());
  const expiryDate = formatDate(data.expiry_date);
  const totalTVA = (data.total_ttc || 0) - (data.total_ht || 0);

  // Calculer les colonnes à afficher
  const showDescription = shouldShowColumn(template, "description");
  const showReference = shouldShowColumn(template, "reference");
  const showQuantity = shouldShowColumn(template, "quantity");
  const showUnit = shouldShowColumn(template, "unit");
  const showUnitPrice = shouldShowColumn(template, "unit_price_ht");
  const showVatRate = template.show_vat !== false && shouldShowColumn(template, "vat_rate");
  const showDiscount = template.show_discounts !== false && shouldShowColumn(template, "discount");
  const showTotalHT = shouldShowColumn(template, "total_ht");

  // Générer l'en-tête selon le layout
  const renderHeader = (): string => {
    if (!template.header_logo) {
      // Sans logo, afficher juste le titre
      return `
        <div style="padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: ${mainColor};">${docTypeLabel}</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">N° ${data.numero}</p>
        </div>
      `;
    }

    const logoHtml = `<img src="${template.header_logo}" alt="Logo" style="height: ${logoSize}; object-fit: contain;" />`;
    const titleHtml = `
      <div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 4px 0; color: ${mainColor};">${docTypeLabel}</h1>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">N° ${data.numero}</p>
      </div>
    `;

    switch (template.header_layout) {
      case "logo-center":
        return `
          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">${logoHtml}</div>
            ${titleHtml}
          </div>
        `;
      case "logo-right":
        return `
          <div style="display: flex; flex-direction: row-reverse; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
            <div>${logoHtml}</div>
            ${titleHtml}
          </div>
        `;
      case "split":
        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
            <div>${logoHtml}</div>
            <div style="text-align: right;">${titleHtml}</div>
          </div>
        `;
      default: // logo-left
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid ${mainColor}; margin-bottom: 24px;">
            <div>${logoHtml}</div>
            ${titleHtml}
          </div>
        `;
    }
  };

  // Générer les blocs Émetteur et Client
  const renderInfoBlocks = (): string => {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Bloc Émetteur -->
        <div style="background: ${mainColor}08; padding: 16px; border-radius: 8px; border-left: 4px solid ${mainColor};">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: ${mainColor};">Émetteur</h3>
          <div style="font-size: 13px; line-height: 1.6;">
            <div style="font-weight: 500; margin-bottom: 4px;">${data.company_name || "Votre entreprise"}</div>
            ${data.company_adresse ? `<div style="color: #6b7280;">${data.company_adresse}</div>` : ""}
            ${data.company_telephone ? `<div style="color: #6b7280;">Tél: ${data.company_telephone}</div>` : ""}
            ${data.company_email ? `<div style="color: #6b7280;">${data.company_email}</div>` : ""}
            ${data.company_siret ? `<div style="color: #6b7280; font-size: 12px; margin-top: 4px;">SIRET: ${data.company_siret}</div>` : ""}
          </div>
        </div>

        <!-- Bloc Client -->
        <div style="background: ${accentColor}08; padding: 16px; border-radius: 8px; border-left: 4px solid ${accentColor};">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor};">Client</h3>
          <div style="font-size: 13px; line-height: 1.6;">
            <div style="font-weight: 500; margin-bottom: 4px;">${data.client_nom}</div>
            ${data.client_adresse ? `<div style="color: #6b7280;">${data.client_adresse}</div>` : ""}
            ${data.client_telephone ? `<div style="color: #6b7280;">Tél: ${data.client_telephone}</div>` : ""}
            ${data.client_email ? `<div style="color: #6b7280;">${data.client_email}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  };

  // Générer les infos du document (dates)
  const renderDocumentInfo = (): string => {
    return `
      <div style="display: flex; gap: 24px; margin-bottom: 24px; font-size: 13px;">
        <div>
          <span style="color: #6b7280;">Date :</span>
          <span style="font-weight: 500; margin-left: 8px;">${issuedDate}</span>
        </div>
        ${expiryDate && documentType === "QUOTE" ? `
          <div>
            <span style="color: #6b7280;">Valable jusqu'au :</span>
            <span style="font-weight: 500; margin-left: 8px;">${expiryDate}</span>
          </div>
        ` : ""}
      </div>
    `;
  };

  // Générer le titre du devis (si présent)
  const renderTitle = (): string => {
    if (!data.title) return "";
    return `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0; color: #1a1a1a;">${data.title}</h2>
      </div>
    `;
  };

  // Générer le tableau des lignes
  const renderLinesTable = (): string => {
    const lines = data.lignes || [];

    // En-têtes du tableau
    let headers = "";
    if (showDescription) headers += `<th style="text-align: left; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">Description</th>`;
    if (showReference) headers += `<th style="text-align: left; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">Réf.</th>`;
    if (showQuantity) headers += `<th style="text-align: center; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">Qté</th>`;
    if (showUnit) headers += `<th style="text-align: center; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">Unité</th>`;
    if (showUnitPrice) headers += `<th style="text-align: right; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">P.U. HT</th>`;
    if (showVatRate) headers += `<th style="text-align: center; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">TVA</th>`;
    if (showDiscount) headers += `<th style="text-align: right; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">Remise</th>`;
    if (showTotalHT) headers += `<th style="text-align: right; padding: 12px 8px; color: ${mainColor}; font-weight: 600;">Total HT</th>`;

    // Lignes du tableau
    const rows = lines.map((line, idx) => {
      const description = line.name || line.description || "";
      const reference = line.reference || "";
      const qty = line.qty || line.quantite || 1;
      const unit = line.unit || "";
      const unitPrice = line.unit_price_ht || line.prix_unitaire || 0;
      const tvaRate = line.tva_rate || template.default_vat_rate || 20;
      const discount = line.discount || 0;
      const total = line.total || (qty * unitPrice);

      let cells = "";
      if (showDescription) {
        cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 500;">${description}</div>
        </td>`;
      }
      if (showReference) cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${reference}</td>`;
      if (showQuantity) cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>`;
      if (showUnit) cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${unit}</td>`;
      if (showUnitPrice) cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(unitPrice)}</td>`;
      if (showVatRate) cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${tvaRate}%</td>`;
      if (showDiscount) cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a;">${discount > 0 ? `-${formatCurrency(discount)}` : "-"}</td>`;
      if (showTotalHT) cells += `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${formatCurrency(total)}</td>`;

      return `<tr style="background: ${idx % 2 === 0 ? 'transparent' : '#f9fafb'};">${cells}</tr>`;
    }).join("");

    if (lines.length === 0) {
      const colSpan = [showDescription, showReference, showQuantity, showUnit, showUnitPrice, showVatRate, showDiscount, showTotalHT].filter(Boolean).length;
      return `
        <div style="margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid ${mainColor};">${headers}</tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="${colSpan}" style="text-align: center; padding: 20px; color: #9ca3af;">Aucune ligne</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <div style="margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="border-bottom: 2px solid ${mainColor};">${headers}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  // Générer les totaux
  const renderTotals = (): string => {
    const showVat = template.show_vat !== false;
    const showDiscounts = template.show_discounts !== false && (data.remise || 0) > 0;
    const showDeposit = (data.acompte || 0) > 0;

    return `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
        <div style="width: 280px;">
          ${showVat ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #6b7280;">Total HT :</span>
              <span style="font-weight: 500;">${formatCurrency(data.total_ht)}</span>
            </div>
          ` : ""}

          ${showDiscounts ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #16a34a;">
              <span>Remise :</span>
              <span>-${formatCurrency(data.remise)}</span>
            </div>
          ` : ""}

          ${showVat ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #6b7280;">TVA :</span>
              <span style="font-weight: 500;">${formatCurrency(totalTVA)}</span>
            </div>
          ` : ""}

          <div style="display: flex; justify-content: space-between; padding: 12px 0; margin-top: 8px; border-top: 2px solid ${mainColor}; font-size: 18px; font-weight: bold; color: ${mainColor};">
            <span>Total TTC :</span>
            <span>${formatCurrency(data.total_ttc)}</span>
          </div>

          ${showDeposit ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #ea580c; font-weight: 600;">
              <span>Acompte requis :</span>
              <span>${formatCurrency(data.acompte)}</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  };

  // Générer le message client
  const renderClientMessage = (): string => {
    if (!data.message_client) return "";
    return `
      <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${accentColor};">
        <p style="font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${data.message_client}</p>
      </div>
    `;
  };

  // Générer les conditions
  const renderConditions = (): string => {
    if (!data.conditions) return "";
    return `
      <div style="margin-bottom: 24px; font-size: 12px; color: #6b7280; line-height: 1.6;">
        <p style="margin: 0; white-space: pre-wrap;">${data.conditions}</p>
      </div>
    `;
  };

  // Générer la zone de signature
  const renderSignature = (): string => {
    if (!template.signature_enabled && !data.signature?.signature_image_url) return "";

    const hasSignature = data.signature?.signature_image_url && data.signature?.signed_at;
    const signatureDate = hasSignature ? formatDate(data.signature!.signed_at) : "";

    if (hasSignature) {
      return `
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; font-weight: 600; margin: 0 0 16px 0;">Bon pour accord</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
            <div>
              <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">Date et signature du client :</p>
              <img src="${data.signature!.signature_image_url}" alt="Signature" style="max-width: 280px; max-height: 80px; display: block; margin-bottom: 8px;" />
              <p style="margin: 0; font-size: 12px;"><strong>${data.signature!.signer_name || ""}</strong></p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Date : ${signatureDate}</p>
            </div>
            <div>
              <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">Cachet de l'entreprise :</p>
              <div style="height: 80px; border-bottom: 1px dashed #d1d5db;"></div>
            </div>
          </div>
        </div>
      `;
    }

    if (template.signature_enabled && documentType === "QUOTE") {
      return `
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; font-weight: 600; margin: 0 0 16px 0;">Bon pour accord</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
            <div>
              <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">Date et signature du client :</p>
              <div style="height: 80px; border-bottom: 1px dashed #d1d5db;"></div>
            </div>
            <div>
              <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">Cachet de l'entreprise :</p>
              <div style="height: 80px; border-bottom: 1px dashed #d1d5db;"></div>
            </div>
          </div>
        </div>
      `;
    }

    return "";
  };

  // Générer le HTML personnalisé (header, content, footer)
  const customHeaderHtml = template.header_html
    ? replaceTemplateVariables(template.header_html, data)
    : "";
  const customContentHtml = template.content_html
    ? replaceTemplateVariables(template.content_html, data)
    : "";
  const customFooterHtml = template.footer_html
    ? replaceTemplateVariables(template.footer_html, data)
    : "";

  // Méthode de paiement
  const renderPaymentMethod = (): string => {
    if (!template.default_payment_method) return "";
    return `
      <div style="margin-bottom: 24px; padding: 12px 16px; background: ${accentColor}08; border-radius: 8px;">
        <span style="font-size: 13px;">
          <strong>Méthode de paiement :</strong> ${template.default_payment_method}
        </span>
      </div>
    `;
  };

  // Assembler le document complet
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${docTypeLabel} ${data.numero}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: ${fontFamily};
      color: #1a1a1a;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
      ${backgroundStyle}
    }
    @media print {
      body { padding: 20px; }
    }
    ${template.css || ""}
  </style>
</head>
<body>
  ${renderHeader()}

  ${customHeaderHtml ? `<div style="margin-bottom: 24px;">${customHeaderHtml}</div>` : ""}

  ${renderInfoBlocks()}

  ${renderDocumentInfo()}

  ${renderTitle()}

  ${customContentHtml ? `<div style="margin-bottom: 24px;">${customContentHtml}</div>` : renderLinesTable()}

  ${renderTotals()}

  ${renderPaymentMethod()}

  ${renderClientMessage()}

  ${renderConditions()}

  ${customFooterHtml ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${customFooterHtml}</div>` : ""}

  ${renderSignature()}
</body>
</html>
  `.trim();
}

// ============================================================================
// SAMPLE DATA FOR PREVIEW
// ============================================================================

/**
 * Génère des données d'exemple pour l'aperçu dans l'éditeur de templates
 */
export function getSampleQuoteData(): QuoteRenderData {
  return {
    numero: "DEV-2025-001",
    title: "Remplacement vitrages salon",
    issued_at: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),

    client_nom: "Jean Dupont",
    client_email: "jean.dupont@example.com",
    client_telephone: "06 12 34 56 78",
    client_adresse: "123 Rue de la République, 75001 Paris",

    company_name: "Provia Glass",
    company_email: "contact@provia-glass.fr",
    company_telephone: "01 23 45 67 89",
    company_adresse: "456 Avenue des Champs, 75008 Paris",
    company_siret: "123 456 789 00010",
    company_website: "www.provia-glass.fr",

    total_ht: 1500.00,
    total_ttc: 1800.00,
    remise: 0,
    acompte: 450.00,

    lignes: [
      {
        name: "Double vitrage 4/16/4 Argon",
        reference: "DV-4164-ARG",
        qty: 2,
        unit: "m²",
        unit_price_ht: 450.00,
        tva_rate: 20,
        total: 900.00,
      },
      {
        name: "Main d'œuvre pose",
        description: "Dépose et pose des vitrages",
        qty: 1,
        unit: "forfait",
        unit_price_ht: 600.00,
        tva_rate: 20,
        total: 600.00,
      },
    ],

    message_client: "Merci pour votre confiance. N'hésitez pas à nous contacter pour toute question.",
    conditions: "Devis valable 30 jours. Acompte de 25% à la commande. Solde à la livraison.",
  };
}
