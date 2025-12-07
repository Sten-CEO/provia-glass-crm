import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateQuotePDF } from '../_shared/pdf-generator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Token manquant');
    }

    console.log('Fetching public quote with token:', token);

    // Créer le client Supabase avec SERVICE_ROLE_KEY pour accès public
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer le devis par token (accès public)
    const { data: quote, error: quoteError } = await supabase
      .from('devis')
      .select(`
        *,
        clients(*),
        companies(*),
        quote_signatures(*)
      `)
      .eq('token', token)
      .single();

    if (quoteError || !quote) {
      console.error('Quote error:', quoteError);
      throw new Error('Devis introuvable ou lien invalide');
    }

    // Vérifier si le devis a expiré
    if (quote.expiry_date) {
      const expiryDate = new Date(quote.expiry_date);
      const now = new Date();
      if (now > expiryDate) {
        return new Response(
          JSON.stringify({
            error: 'Ce devis a expiré',
            expired: true,
            quote: {
              numero: quote.numero,
              expiry_date: quote.expiry_date
            }
          }),
          {
            status: 410, // Gone
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Générer le PDF
    const { buffer: pdfBuffer, filename: pdfFilename } = await generateQuotePDF(quote, supabase);

    // Convertir le PDF en base64 pour le renvoyer au frontend
    const pdfBase64 = btoa(String.fromCharCode(...pdfBuffer));

    console.log('Quote fetched successfully');

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          id: quote.id,
          numero: quote.numero,
          client_nom: quote.client_nom,
          client_email: quote.contact_email,
          total_ht: quote.total_ht,
          total_ttc: quote.total_ttc,
          issued_at: quote.issued_at,
          expiry_date: quote.expiry_date,
          statut: quote.statut,
          company: {
            name: quote.companies?.name,
            email: quote.companies?.email,
            telephone: quote.companies?.telephone,
            adresse: quote.companies?.adresse,
          },
          signature: quote.quote_signatures?.[0] || null,
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
    console.error('Error fetching public quote:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la récupération du devis' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
