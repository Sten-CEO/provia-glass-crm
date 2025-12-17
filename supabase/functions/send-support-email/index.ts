import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmailViaSMTP } from '../_shared/smtp-mailer.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SupportEmailRequest {
  nom: string;
  email: string;
  message: string;
  companyId?: string;
}

const SUPPORT_EMAIL = 'support@proviabase.fr';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { nom, email, message, companyId }: SupportEmailRequest = await req.json();

    // Validation
    if (!nom || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Nom, email et message sont requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Format d\'email invalide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get company SMTP settings
    let company = null;
    if (companyId) {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      company = data;
    }

    // Check if SMTP is configured
    if (!company?.smtp_enabled || !company?.smtp_host || !company?.smtp_username || !company?.smtp_password) {
      return new Response(
        JSON.stringify({ error: 'Configuration SMTP non disponible. Contactez le support directement à ' + SUPPORT_EMAIL }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #E5A936; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Nouveau message support</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          <div style="margin-bottom: 20px; padding: 15px; background-color: white; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Informations client</h3>
            <p style="margin: 5px 0;"><strong>Nom:</strong> ${escapeHtml(nom)}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            ${company?.name ? `<p style="margin: 5px 0;"><strong>Entreprise:</strong> ${escapeHtml(company.name)}</p>` : ''}
          </div>

          <div style="padding: 15px; background-color: white; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Message</h3>
            <div style="white-space: pre-wrap; color: #666;">${escapeHtml(message)}</div>
          </div>
        </div>

        <div style="padding: 15px; text-align: center; font-size: 12px; color: #999;">
          <p>Email envoyé depuis le CRM Provia BASE</p>
          <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    `;

    const textContent = `
Nouveau message support

Nom: ${nom}
Email: ${email}
${company?.name ? `Entreprise: ${company.name}` : ''}

Message:
${message}

---
Envoyé depuis le CRM Provia BASE
    `.trim();

    // Send email via SMTP
    const emailResult = await sendEmailViaSMTP(
      {
        host: company.smtp_host,
        port: company.smtp_port || 587,
        username: company.smtp_username,
        password: company.smtp_password,
        secure: company.smtp_secure ?? false,
      },
      {
        from: company.smtp_username,
        to: SUPPORT_EMAIL,
        replyTo: email,
        subject: `[Support CRM] Message de ${nom}`,
        html: htmlContent,
        text: textContent,
      }
    );

    if (!emailResult.success) {
      console.error('SMTP error:', emailResult.error);
      return new Response(
        JSON.stringify({ error: emailResult.error || 'Erreur lors de l\'envoi de l\'email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message envoyé avec succès',
        messageId: emailResult.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error sending support email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur inattendue' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}
