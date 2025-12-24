import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmailViaSMTP } from '../_shared/smtp-mailer.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SupportEmailRequest {
  nom: string;
  email: string;
  message: string;
}

// Configuration SMTP pour le support (variables d'environnement Supabase)
const SMTP_HOST = Deno.env.get('SUPPORT_SMTP_HOST') || 'smtp.ionos.fr';
const SMTP_PORT = parseInt(Deno.env.get('SUPPORT_SMTP_PORT') || '587');
const SMTP_USERNAME = Deno.env.get('SUPPORT_SMTP_USERNAME');
const SMTP_PASSWORD = Deno.env.get('SUPPORT_SMTP_PASSWORD');
const SMTP_SECURE = Deno.env.get('SUPPORT_SMTP_SECURE') === 'true';
const SUPPORT_EMAIL = 'support@proviabase.fr';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { nom, email, message }: SupportEmailRequest = await req.json();

    // Validation
    if (!nom || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Nom, email et message sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Format d\'email invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check SMTP configuration
    if (!SMTP_USERNAME || !SMTP_PASSWORD) {
      console.error('SMTP credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration email non disponible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #E5A936; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Nouveau message support</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <p><strong>Nom:</strong> ${escapeHtml(nom)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p><strong>Message:</strong></p>
          <div style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 8px;">${escapeHtml(message)}</div>
        </div>
        <div style="padding: 15px; text-align: center; font-size: 12px; color: #999;">
          Envoyé depuis le CRM Provia BASE - ${new Date().toLocaleString('fr-FR')}
        </div>
      </div>
    `;

    const textContent = `Nouveau message support\n\nNom: ${nom}\nEmail: ${email}\n\nMessage:\n${message}`;

    // Send email via SMTP
    const emailResult = await sendEmailViaSMTP(
      {
        host: SMTP_HOST,
        port: SMTP_PORT,
        username: SMTP_USERNAME,
        password: SMTP_PASSWORD,
        secure: SMTP_SECURE,
      },
      {
        from: SMTP_USERNAME,
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
        JSON.stringify({ error: 'Erreur lors de l\'envoi' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Message envoyé' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur inattendue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}
