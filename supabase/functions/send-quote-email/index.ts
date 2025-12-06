import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateQuotePDF } from '../_shared/pdf-generator.ts';

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

/**
 * Envoie un email via Resend avec pièce jointe PDF
 */
async function sendEmailWithResend(params: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: Uint8Array;
  }>;
  resendApiKey: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, from, replyTo, subject, html, text, attachments, resendApiKey } = params;

    // Préparer les pièces jointes au format base64 pour Resend
    const formattedAttachments = attachments?.map(att => ({
      filename: att.filename,
      content: btoa(String.fromCharCode(...att.content)), // Convertir Uint8Array en base64
    }));

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
        text,
        attachments: formattedAttachments,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return {
        success: false,
        error: data.message || 'Erreur lors de l\'envoi de l\'email',
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error('Error sending email with Resend:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification d'abord
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Non authentifié');
    }

    // Créer un client Supabase avec le token de l'utilisateur pour l'authentification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Utilisateur non trouvé');
    }

    console.log('User authenticated:', user.id);

    // Créer un client avec privilèges élevés pour les opérations sensibles
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { quoteId, recipientEmail, recipientName, subject, message, templateId }: SendQuoteEmailRequest = await req.json();

    console.log('Sending quote email:', { quoteId, recipientEmail, templateId });

    // Récupérer le company_id de l'utilisateur
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      // Essayer de récupérer depuis equipe si c'est un employé
      const { data: employee } = await supabase
        .from('equipe')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!employee) {
        throw new Error('Société non trouvée pour cet utilisateur');
      }
      userRole = employee;
    }

    const companyId = userRole.company_id;

    // Récupérer le devis avec les infos client et entreprise
    const { data: quote, error: quoteError } = await supabase
      .from('devis')
      .select(`
        *,
        clients(*),
        companies(*)
      `)
      .eq('id', quoteId)
      .eq('company_id', companyId) // Sécurité : vérifier que le devis appartient à la company
      .single();

    if (quoteError || !quote) {
      console.error('Quote error:', quoteError);
      throw new Error('Devis introuvable ou accès non autorisé');
    }

    // Récupérer les informations de la société
    const company = quote.companies;
    if (!company) {
      throw new Error('Informations de société manquantes');
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
      NomEntreprise: company.name || 'Provia Glass',
      EmailEntreprise: company.email || '',
      TelephoneEntreprise: company.telephone || '',
      AdresseEntreprise: company.adresse || '',
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
      console.log('Quote link:', `/quote/${token}`);
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

    // ENVOI RÉEL avec Resend

    // 1. Générer le PDF du devis
    const { buffer: pdfBuffer, filename: pdfFilename } = await generateQuotePDF(quote, supabase);

    // 2. Préparer le contenu HTML de l'email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4A90E2; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${company.name || 'Provia Glass'}</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          ${finalMessage.split('\n').map(line => `<p>${line}</p>`).join('')}

          <div style="margin: 30px 0; padding: 20px; background-color: white; border-left: 4px solid #4A90E2;">
            <h2 style="margin-top: 0; color: #333;">Devis ${quote.numero}</h2>
            <p style="color: #666; margin: 5px 0;"><strong>Montant TTC:</strong> ${formatCurrency(quote.total_ttc || 0)}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Valable jusqu'au:</strong> ${quote.expiry_date ? formatDate(quote.expiry_date) : 'N/A'}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${Deno.env.get('SUPABASE_URL')}/quote/${token}"
               style="display: inline-block; background-color: #4A90E2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Consulter et signer le devis en ligne
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
            <p>${company.name || 'Provia Glass'}</p>
            ${company.adresse ? `<p>${company.adresse}</p>` : ''}
            ${company.telephone ? `<p>Tél: ${company.telephone}</p>` : ''}
            ${company.email ? `<p>Email: ${company.email}</p>` : ''}
          </div>
        </div>
      </div>
    `;

    // 3. Préparer le texte brut (fallback)
    const textContent = finalMessage + `\n\nConsulter le devis: ${Deno.env.get('SUPABASE_URL')}/quote/${token}`;

    // 4. Déterminer l'email d'expédition
    // Utiliser email_from s'il existe, sinon email, sinon un email par défaut
    const fromEmail = company.email_from || company.email || 'noreply@proviabase.app';
    const replyToEmail = company.email || company.email_from || fromEmail;

    // Le "from" doit être un domaine vérifié dans Resend
    // On utilise un domaine par défaut et on met l'email de la société en reply-to
    const from = `${company.name || 'Provia Glass'} <noreply@proviabase.app>`;

    // 5. Envoyer l'email avec Resend
    const emailResult = await sendEmailWithResend({
      to: recipientEmail,
      from,
      replyTo: replyToEmail,
      subject: finalSubject,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      ],
      resendApiKey,
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Erreur lors de l\'envoi de l\'email');
    }

    console.log('Email sent successfully:', emailResult.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email envoyé avec succès',
        messageId: emailResult.messageId,
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
