/**
 * PDF Generator Utility
 *
 * Génère des PDFs pour les devis et factures en utilisant le renderer HTML unifié.
 *
 * IMPORTANT: Ce fichier utilise maintenant le renderer unifié (quoteHtmlRenderer.ts)
 * pour garantir que le PDF généré est IDENTIQUE à l'aperçu dans l'application.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  renderQuoteToHtml,
  convertQuoteToRenderData,
  getDefaultTemplate,
  DocumentTemplate,
} from './quoteHtmlRenderer.ts';

interface QuoteData {
  id: string;
  numero: string;
  client_nom: string;
  total_ht?: number;
  total_ttc?: number;
  lignes?: any[];
  template_id?: string;
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
 * Génère un PDF HTML pour un devis
 * Utilise le renderer unifié pour garantir la cohérence avec l'aperçu
 */
export async function generateQuotePDF(
  quote: QuoteData,
  supabase: SupabaseClient
): Promise<{ buffer: Uint8Array; filename: string }> {
  // Récupérer le template si template_id est fourni
  let template: Partial<DocumentTemplate> = getDefaultTemplate();

  if (quote.template_id) {
    const { data, error } = await supabase
      .from('doc_templates')
      .select('*')
      .eq('id', quote.template_id)
      .single();

    if (error) {
      console.error('❌ Error loading template:', error);
    } else if (data) {
      template = data;
    }
  }

  // Convertir les données du devis au format attendu par le renderer
  const renderData = convertQuoteToRenderData(quote);

  // Générer le HTML avec le renderer unifié
  const html = renderQuoteToHtml(renderData, template, {
    documentType: 'QUOTE',
    mode: 'pdf',
  });

  // Convertir le HTML en buffer (UTF-8)
  const buffer = new TextEncoder().encode(html);
  const filename = `Devis_${quote.numero}.pdf`;

  return { buffer, filename };
}

/**
 * Génère un PDF HTML pour une facture
 */
export async function generateInvoicePDF(
  invoice: InvoiceData,
  supabase: SupabaseClient
): Promise<{ buffer: Uint8Array; filename: string }> {
  // Récupérer le template si template_id est fourni
  let template: Partial<DocumentTemplate> = getDefaultTemplate();
  template.type = 'INVOICE';

  if (invoice.template_id) {
    const { data, error } = await supabase
      .from('doc_templates')
      .select('*')
      .eq('id', invoice.template_id)
      .single();

    if (!error && data) {
      template = data;
    }
  }

  // Convertir les données de la facture au format attendu par le renderer
  const renderData = convertQuoteToRenderData(invoice);

  // Générer le HTML avec le renderer unifié
  const html = renderQuoteToHtml(renderData, template, {
    documentType: 'INVOICE',
    mode: 'pdf',
  });

  const buffer = new TextEncoder().encode(html);
  const filename = `Facture_${invoice.numero}.pdf`;

  return { buffer, filename };
}

/**
 * Exporte le HTML brut pour un devis (utile pour la page publique)
 */
export async function generateQuoteHTML(
  quote: QuoteData,
  supabase: SupabaseClient
): Promise<string> {
  // Récupérer le template si template_id est fourni
  let template: Partial<DocumentTemplate> = getDefaultTemplate();

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

  // Convertir les données du devis au format attendu par le renderer
  const renderData = convertQuoteToRenderData(quote);

  // Générer et retourner le HTML
  return renderQuoteToHtml(renderData, template, {
    documentType: 'QUOTE',
    mode: 'pdf',
  });
}
