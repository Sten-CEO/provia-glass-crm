import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateInvoicePDF } from '../_shared/pdf-generator.ts';
import { sendEmailViaSMTP } from '../_shared/smtp-mailer.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SendInvoiceEmailRequest {
  invoiceId: string;
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
  result = result.replace(/\{\{NumFacture\}\}/g, values.NumFacture || '');
  result = result.replace(/\{\{NumDocument\}\}/g, values.NumDocument || '');
  result = result.replace(/\{\{TypeDocument\}\}/g, values.TypeDocument || '');
  result = result.replace(/\{\{MontantHT\}\}/g, values.MontantHT || '');
  result = result.replace(/\{\{MontantTTC\}\}/g, values.MontantTTC || '');
  result = result.replace(/\{\{DateEnvoi\}\}/g, values.DateEnvoi || '');
  result = result.replace(/\{\{DateEcheance\}\}/g, values.DateEcheance || '');
  result = result.replace(/\{\{DateCreation\}\}/g, values.DateCreation || '');

  // Company variables
  result = result.replace(/\{\{NomEntreprise\}\}/g, values.NomEntreprise || '');
  result = result.replace(/\{\{EmailEntreprise\}\}/g, values.EmailEntreprise || '');
  result = result.replace(/\{\{TelephoneEntreprise\}\}/g, values.TelephoneEntreprise || '');
  result = result.replace(/\{\{AdresseEntreprise\}\}/g, values.AdresseEntreprise || '');

  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { invoiceId, recipientEmail, recipientName, subject, message, templateId }: SendInvoiceEmailRequest = await req.json();

    console.log('Sending invoice email:', { invoiceId, recipientEmail, templateId });

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('Non authentifié');
    }

    // Décoder le JWT pour extraire le user_id
    const jwt = authHeader.replace('Bearer ', '');
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT invalide');
    }

    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('User ID non trouvé dans le token');
    }

    console.log('User authenticated:', userId);

    // Créer le client Supabase avec SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer le company_id de l'utilisateur
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (roleError || !userRole) {
      // Essayer de récupérer depuis equipe si c'est un employé
      const { data: employee } = await supabase
        .from('equipe')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (!employee) {
        throw new Error('Société non trouvée pour cet utilisateur');
      }
      userRole = employee;
    }

    const companyId = userRole.company_id;

    // Récupérer la facture avec les infos client et entreprise
    const { data: invoice, error: invoiceError } = await supabase
      .from('factures')
      .select(`
        *,
        clients:client_id (nom, email, telephone, adresse),
        companies:company_id (*)
      `)
      .eq('id', invoiceId)
      .eq('company_id', companyId) // Sécurité : vérifier que la facture appartient à la company
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice error:', invoiceError);
      throw new Error('Facture introuvable ou accès non autorisé');
    }

    // Récupérer les informations de la société
    const company = invoice.companies;
    if (!company) {
      throw new Error('Informations de société manquantes');
    }

    // Vérifier la configuration SMTP
    if (!company.smtp_enabled) {
      throw new Error('Configuration SMTP non activée. Veuillez configurer votre SMTP dans les paramètres de société.');
    }

    if (!company.smtp_host || !company.smtp_port || !company.smtp_username || !company.smtp_password) {
      throw new Error('Configuration SMTP incomplète. Veuillez renseigner tous les champs SMTP dans les paramètres.');
    }

    // Préparer les variables pour le template
    const variables = {
      NomClient: recipientName || invoice.clients?.nom || invoice.client_nom || '',
      EmailClient: recipientEmail || invoice.clients?.email || '',
      TelephoneClient: invoice.clients?.telephone || '',
      AdresseClient: invoice.clients?.adresse || '',
      NumFacture: invoice.numero || '',
      NumDocument: invoice.numero || '',
      TypeDocument: 'Facture',
      MontantHT: formatCurrency(invoice.total_ht || 0),
      MontantTTC: formatCurrency(invoice.total_ttc || 0),
      DateEnvoi: formatDate(new Date().toISOString()),
      DateCreation: formatDate(invoice.issue_date || new Date().toISOString()),
      DateEcheance: invoice.echeance ? formatDate(invoice.echeance) : '',
      NomEntreprise: company.name || 'Provia Glass',
      EmailEntreprise: company.email || '',
      TelephoneEntreprise: company.telephone || '',
      AdresseEntreprise: company.adresse || '',
    };

    // Si un template est fourni, l'utiliser
    let finalSubject = subject || `Facture ${invoice.numero}`;
    let finalMessage = message || 'Veuillez trouver ci-joint votre facture.';

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

    // Générer le PDF de la facture
    const { buffer: pdfBuffer, filename: pdfFilename } = await generateInvoicePDF(invoice, supabase);

    // Préparer le contenu HTML de l'email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #E74C3C; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${company.name || 'Provia Glass'}</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          ${finalMessage.split('\n').map(line => `<p>${line}</p>`).join('')}

          <div style="margin: 30px 0; padding: 20px; background-color: white; border-left: 4px solid #E74C3C;">
            <h2 style="margin-top: 0; color: #333;">Facture ${invoice.numero}</h2>
            <p style="color: #666; margin: 5px 0;"><strong>Montant TTC:</strong> ${formatCurrency(invoice.total_ttc || 0)}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Date d'échéance:</strong> ${invoice.echeance ? formatDate(invoice.echeance) : 'N/A'}</p>
            ${invoice.statut === 'Payée' ? '<p style="color: #27AE60; font-weight: bold; margin: 10px 0;">✓ Payée</p>' : '<p style="color: #E74C3C; font-weight: bold; margin: 10px 0;">⚠ En attente de paiement</p>'}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
            <p>${company.name || 'Provia Glass'}</p>
            ${company.adresse ? `<p>${company.adresse}</p>` : ''}
            ${company.telephone ? `<p>Tél: ${company.telephone}</p>` : ''}
            ${company.email ? `<p>Email: ${company.email}</p>` : ''}
            ${company.siret ? `<p>SIRET: ${company.siret}</p>` : ''}
          </div>
        </div>
      </div>
    `;

    // Préparer le texte brut (fallback)
    const textContent = finalMessage + `\n\nFacture ${invoice.numero} - Montant: ${formatCurrency(invoice.total_ttc || 0)}`;

    // Envoyer l'email via SMTP
    console.log('Sending email via SMTP...');
    const emailResult = await sendEmailViaSMTP(
      {
        host: company.smtp_host,
        port: company.smtp_port,
        username: company.smtp_username,
        password: company.smtp_password,
        secure: company.smtp_secure ?? true,
      },
      {
        from: company.smtp_username,
        to: recipientEmail,
        subject: finalSubject,
        html: htmlContent,
        text: textContent,
        replyTo: company.smtp_username,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
          },
        ],
      }
    );

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Erreur lors de l\'envoi de l\'email');
    }

    console.log('Email sent successfully via SMTP');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email envoyé avec succès',
        messageId: emailResult.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
