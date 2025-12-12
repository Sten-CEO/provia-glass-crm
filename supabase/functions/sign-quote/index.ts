import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SignQuoteRequest {
  token: string;
  signerName: string;
  signerEmail?: string;
  signatureImage?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { token, signerName, signerEmail, signatureImage }: SignQuoteRequest = await req.json();

    if (!token || !signerName) {
      throw new Error('Token et nom du signataire requis');
    }

    if (!signatureImage) {
      throw new Error('Signature requise');
    }

    // Créer le client Supabase avec SERVICE_ROLE_KEY pour accès public
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer le devis par token
    const { data: quote, error: quoteError } = await supabase
      .from('devis')
      .select('id, numero, statut, expiry_date')
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
        throw new Error('Ce devis a expiré et ne peut plus être signé');
      }
    }

    // Vérifier si le devis n'est pas déjà signé
    const { data: existingSignature } = await supabase
      .from('quote_signatures')
      .select('id')
      .eq('quote_id', quote.id)
      .maybeSingle();

    if (existingSignature) {
      throw new Error('Ce devis a déjà été signé');
    }

    // Récupérer l'IP et User-Agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Créer la signature
    const { error: signatureError } = await supabase
      .from('quote_signatures')
      .insert({
        quote_id: quote.id,
        signer_name: signerName,
        signer_email: signerEmail || null,
        signature_image_url: signatureImage,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (signatureError) {
      console.error('Signature error:', signatureError);
      throw new Error('Erreur lors de l\'enregistrement de la signature');
    }

    // Mettre à jour le statut du devis à "Accepté"
    const { error: updateError } = await supabase
      .from('devis')
      .update({
        statut: 'Accepté'
      })
      .eq('id', quote.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Erreur lors de la mise à jour du statut');
    }

    // Créer un événement de signature
    await supabase.from('quote_events').insert({
      quote_id: quote.id,
      event_type: 'signed',
      metadata: {
        signer_name: signerName,
        signer_email: signerEmail,
        ip_address: ipAddress,
      }
    });

    // Récupérer le company_id du devis pour créer la notification
    const { data: quoteDetails } = await supabase
      .from('devis')
      .select('company_id, client_nom')
      .eq('id', quote.id)
      .single();

    // Créer une notification pour l'acceptation du devis
    if (quoteDetails?.company_id) {
      await supabase.from('notifications').insert({
        company_id: quoteDetails.company_id,
        type: 'quote_signed',
        title: 'Devis accepté',
        message: `Le devis ${quote.numero} a été signé électroniquement par ${signerName}${quoteDetails.client_nom ? ` (${quoteDetails.client_nom})` : ''}.`,
        payload: {
          quote_id: quote.id,
          quote_numero: quote.numero,
          signer_name: signerName,
          link: `/devis/${quote.id}`
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Devis signé avec succès',
        quote: {
          numero: quote.numero,
          statut: 'Accepté'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error signing quote:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la signature du devis' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
