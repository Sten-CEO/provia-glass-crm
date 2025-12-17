import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SupportEmailRequest {
  nom: string;
  email: string;
  message: string;
  companyName?: string;
  userId?: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPPORT_EMAIL = 'support@proviabase.fr';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { nom, email, message, companyName, userId }: SupportEmailRequest = await req.json();

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

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration email manquante' }),
        {
          status: 500,
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
            ${companyName ? `<p style="margin: 5px 0;"><strong>Entreprise:</strong> ${escapeHtml(companyName)}</p>` : ''}
            ${userId ? `<p style="margin: 5px 0; font-size: 12px; color: #999;"><strong>User ID:</strong> ${escapeHtml(userId)}</p>` : ''}
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

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Provia BASE Support <noreply@proviabase.fr>',
        to: [SUPPORT_EMAIL],
        reply_to: email,
        subject: `[Support CRM] Message de ${nom}`,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'envoi de l\'email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message envoyé avec succès',
        id: result.id,
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
