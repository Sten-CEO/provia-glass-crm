import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { generateInvoicePDF } from '../_shared/pdf-generator.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { createSupabaseAdmin, validateAuthAndGetCompany } from '../_shared/auth.ts';

interface GenerateInvoicePDFRequest {
  invoiceId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { invoiceId }: GenerateInvoicePDFRequest = await req.json();

    if (!invoiceId) {
      throw new Error('ID de facture requis');
    }

    // Créer le client Supabase admin
    const supabase = createSupabaseAdmin();

    // Valider le JWT de manière sécurisée et récupérer le company_id
    const { userId, companyId, error: authError } = await validateAuthAndGetCompany(req, supabase);

    if (authError) {
      throw new Error(authError);
    }

    // Récupérer la facture avec les infos client
    const { data: invoice, error: invoiceError } = await supabase
      .from('factures')
      .select(`
        *,
        clients:client_id (nom, email, telephone, adresse, ville, code_postal),
        companies:company_id (*)
      `)
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice error:', invoiceError);
      throw new Error('Facture introuvable ou accès non autorisé');
    }

    // Générer le PDF
    const { buffer, filename } = await generateInvoicePDF(invoice, supabase);

    // Convertir le buffer en base64
    const base64 = btoa(String.fromCharCode(...buffer));

    return new Response(
      JSON.stringify({
        success: true,
        pdf: {
          data: base64,
          filename: filename,
          contentType: 'text/html'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la génération du PDF' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
