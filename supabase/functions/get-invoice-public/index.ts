import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { generateInvoicePDF } from '../_shared/pdf-generator.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Lire le token depuis le body JSON
    const { token } = await req.json();

    if (!token) {
      throw new Error('Token manquant');
    }

    // Créer le client Supabase avec SERVICE_ROLE_KEY pour accès public
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer la facture par token (accès public) - sans la jointure companies (pas de FK)
    const { data: invoice, error: invoiceError } = await supabase
      .from('factures')
      .select(`
        *,
        clients:client_id (nom, email, telephone, adresse, company_id),
        invoice_signatures(*)
      `)
      .eq('token', token)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice error:', invoiceError);
      throw new Error('Facture introuvable ou lien invalide');
    }

    // Récupérer les informations de la société
    // Stratégie: 1) invoice.company_id, 2) client.company_id comme fallback
    let company = null;
    let companyId = invoice.company_id;

    console.log('=== GET-INVOICE-PUBLIC DEBUG ===');
    console.log('Invoice numero:', invoice.numero);
    console.log('Invoice company_id:', invoice.company_id);
    console.log('Client company_id:', invoice.clients?.company_id);

    // Fallback: si la facture n'a pas de company_id, utiliser celui du client
    if (!companyId && invoice.clients?.company_id) {
      companyId = invoice.clients.company_id;
      console.log('Using client company_id as fallback:', companyId);
    }

    if (companyId) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('Error fetching company:', companyError);
      } else if (!companyData) {
        console.error('Company not found for id:', companyId);
      } else {
        company = companyData;
        console.log('Company loaded successfully:', { name: company.name, email: company.email });
      }
    } else {
      console.warn('No company_id found on invoice or client!');
    }

    // IMPORTANT: Attacher les données de la société à la facture pour le PDF generator
    invoice.companies = company;

    // Debug logging
    console.log('Company attached to invoice:', company ? { name: company.name, email: company.email } : 'NULL - WILL USE FALLBACK');
    console.log('Invoice lignes count:', (invoice.lignes || []).length);

    // Générer le PDF
    const { buffer: pdfBuffer, filename: pdfFilename } = await generateInvoicePDF(invoice, supabase);

    // Convertir le PDF en base64
    const pdfBase64 = base64Encode(pdfBuffer);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: invoice.id,
          numero: invoice.numero,
          client_nom: invoice.client_nom || invoice.clients?.nom,
          client_email: invoice.clients?.email,
          total_ht: invoice.total_ht,
          total_ttc: invoice.total_ttc,
          issue_date: invoice.issue_date,
          echeance: invoice.echeance,
          statut: invoice.statut,
          company: {
            name: company?.name || '',
            email: company?.email || '',
            telephone: company?.telephone || '',
            adresse: company?.adresse || '',
          },
          signature: invoice.invoice_signatures?.[0] || null,
        },
        pdf: {
          filename: pdfFilename,
          data: pdfBase64
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error fetching public invoice:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la récupération de la facture' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
