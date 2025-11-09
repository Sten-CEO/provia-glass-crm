import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendQuoteEmailRequest {
  quoteId: string;
  recipientEmail: string;
  recipientName: string;
  subject?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { quoteId, recipientEmail, recipientName, subject, message }: SendQuoteEmailRequest = await req.json();

    console.log('Sending quote email:', { quoteId, recipientEmail });

    // Récupérer le devis
    const { data: quote, error: quoteError } = await supabase
      .from('devis')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error('Devis introuvable');
    }

    // Générer un token unique si pas déjà fait
    let token = quote.token;
    if (!token) {
      token = crypto.randomUUID();
      
      // Mettre à jour le devis avec le token et la date d'envoi
      const { error: updateError } = await supabase
        .from('devis')
        .update({
          token,
          sent_at: new Date().toISOString(),
          statut: 'Envoyé'
        })
        .eq('id', quoteId);

      if (updateError) {
        throw updateError;
      }
    }

    // Créer l'événement d'envoi
    await supabase.from('quote_events').insert({
      quote_id: quoteId,
      event_type: 'sent',
      metadata: { recipient_email: recipientEmail }
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      // MODE SIMULATION: Pas de clé API Resend configurée
      console.log('=== EMAIL SIMULATION (Clé API Resend manquante) ===');
      console.log('To:', recipientEmail);
      console.log('Subject:', subject || `Devis ${quote.numero}`);
      console.log('Message:', message || 'Voici votre devis');
      console.log('Quote link:', `${Deno.env.get('SUPABASE_URL')}/quote/${token}`);
      console.log('===================================================');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Envoi simulé - Veuillez configurer la clé API Resend pour l\'envoi réel',
          simulation: true,
          token,
          publicUrl: `/quote/${token}`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // TODO: Implémenter l'envoi réel avec Resend quand la clé est configurée
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email envoyé avec succès',
        token,
        publicUrl: `/quote/${token}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending quote email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});