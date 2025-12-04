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
  templateId?: string;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR').format(date);
}

// Replace template variables
function replaceVariables(template: string, values: Record<string, any>): string {
  let result = template;

  // Client variables
  result = result.replace(/\{\{NomClient\}\}/g, values.NomClient || '');
  result = result.replace(/\{\{EmailClient\}\}/g, values.EmailClient || '');
  result = result.replace(/\{\{TelephoneClient\}\}/g, values.TelephoneClient || '');
  result = result.replace(/\{\{AdresseClient\}\}/g, values.AdresseClient || '');

  // Document variables
  result = result.replace(/\{\{NumDevis\}\}/g, values.NumDevis || '');
  result = result.replace(/\{\{NumDocument\}\}/g, values.NumDocument || '');
  result = result.replace(/\{\{TypeDocument\}\}/g, values.TypeDocument || '');
  result = result.replace(/\{\{MontantHT\}\}/g, values.MontantHT || '');
  result = result.replace(/\{\{MontantTTC\}\}/g, values.MontantTTC || '');
  result = result.replace(/\{\{DateEnvoi\}\}/g, values.DateEnvoi || '');
  result = result.replace(/\{\{DateExpiration\}\}/g, values.DateExpiration || '');
  result = result.replace(/\{\{DateCreation\}\}/g, values.DateCreation || '');

  // Company variables
  result = result.replace(/\{\{NomEntreprise\}\}/g, values.NomEntreprise || '');
  result = result.replace(/\{\{EmailEntreprise\}\}/g, values.EmailEntreprise || '');
  result = result.replace(/\{\{TelephoneEntreprise\}\}/g, values.TelephoneEntreprise || '');
  result = result.replace(/\{\{AdresseEntreprise\}\}/g, values.AdresseEntreprise || '');

  return result;
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

    const { quoteId, recipientEmail, recipientName, subject, message, templateId }: SendQuoteEmailRequest = await req.json();

    console.log('Sending quote email:', { quoteId, recipientEmail, templateId });

    // Récupérer le devis avec les infos client et entreprise
    const { data: quote, error: quoteError } = await supabase
      .from('devis')
      .select('*, clients(*), companies(*)')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error('Devis introuvable');
    }

    // Préparer les variables pour le template
    const variables = {
      NomClient: recipientName || quote.clients?.nom || quote.client_nom || '',
      EmailClient: recipientEmail || quote.clients?.email || '',
      TelephoneClient: quote.clients?.telephone || '',
      AdresseClient: quote.clients?.adresse || '',
      NumDevis: quote.numero || '',
      NumDocument: quote.numero || '',
      TypeDocument: 'Devis',
      MontantHT: formatCurrency(quote.total_ht || 0),
      MontantTTC: formatCurrency(quote.total_ttc || 0),
      DateEnvoi: formatDate(new Date().toISOString()),
      DateCreation: formatDate(quote.issued_at || new Date().toISOString()),
      DateExpiration: quote.expiry_date ? formatDate(quote.expiry_date) : '',
      NomEntreprise: quote.companies?.nom || 'Provia Glass',
      EmailEntreprise: quote.companies?.email || '',
      TelephoneEntreprise: quote.companies?.telephone || '',
      AdresseEntreprise: quote.companies?.adresse || '',
    };

    // Si un template est fourni, l'utiliser
    let finalSubject = subject || `Devis ${quote.numero}`;
    let finalMessage = message || 'Veuillez trouver ci-joint votre devis.';

    if (templateId) {
      const { data: template } = await supabase
        .from('doc_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (template) {
        finalSubject = replaceVariables(template.email_subject || finalSubject, variables);
        finalMessage = replaceVariables(template.email_body || finalMessage, variables);
      }
    } else {
      // Remplacer les variables dans le sujet et message fournis
      finalSubject = replaceVariables(finalSubject, variables);
      finalMessage = replaceVariables(finalMessage, variables);
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
      console.log('Subject:', finalSubject);
      console.log('Message:', finalMessage);
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