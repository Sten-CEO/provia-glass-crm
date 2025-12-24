import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { generateQuotePDF } from '../_shared/pdf-generator.ts';
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

    // Récupérer le devis par token (accès public) - sans la jointure companies (pas de FK)
    const { data: quote, error: quoteError } = await supabase
      .from('devis')
      .select(`
        *,
        clients(*),
        quote_signatures(*)
      `)
      .eq('token', token)
      .single();

    if (quoteError || !quote) {
      console.error('Quote error:', quoteError);
      throw new Error('Devis introuvable ou lien invalide');
    }

    // Récupérer les informations de la société séparément (pas de FK entre devis et companies)
    let company = null;
    if (quote.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', quote.company_id)
        .single();
      company = companyData;
    }

    // IMPORTANT: Attacher les données de la société au quote pour le PDF generator
    // Le renderer attend quote.companies pour générer le PDF avec les bonnes infos
    quote.companies = company;

    // Debug logging pour vérifier les données
    console.log('=== GET-QUOTE-PUBLIC DEBUG ===');
    console.log('Quote numero:', quote.numero);
    console.log('Company data:', company ? { name: company.name, email: company.email } : 'NULL');
    console.log('Quote lignes count:', (quote.lignes || []).length);
    console.log('Quote lignes sample:', JSON.stringify((quote.lignes || []).slice(0, 2)));
    console.log('Quote template_id:', quote.template_id);

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

    // Convertir le PDF en base64 (méthode correcte pour préserver l'encodage UTF-8)
    const pdfBase64 = base64Encode(pdfBuffer);

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
            name: company?.name || '',
            email: company?.email || '',
            telephone: company?.telephone || '',
            adresse: company?.adresse || '',
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
