import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { testSmtpConfiguration } from '../_shared/smtp-mailer.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { createSupabaseAdmin, validateAuthAndGetCompany } from '../_shared/auth.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Créer le client Supabase admin
    const supabase = createSupabaseAdmin();

    // Valider le JWT de manière sécurisée et récupérer le company_id
    const { userId, companyId, error: authError } = await validateAuthAndGetCompany(req, supabase);

    if (authError) {
      throw new Error(authError);
    }

    // Récupérer la configuration SMTP de la société
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('smtp_enabled, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error('Configuration SMTP introuvable');
    }

    // Vérifier que SMTP est activé
    if (!company.smtp_enabled) {
      throw new Error('SMTP n\'est pas activé pour cette société');
    }

    // Vérifier que tous les champs sont renseignés
    if (!company.smtp_host || !company.smtp_port || !company.smtp_username || !company.smtp_password) {
      throw new Error('Configuration SMTP incomplète. Veuillez renseigner tous les champs.');
    }

    // Tester la configuration SMTP
    const result = await testSmtpConfiguration({
      host: company.smtp_host,
      port: company.smtp_port,
      username: company.smtp_username,
      password: company.smtp_password,
      secure: company.smtp_secure ?? true,
    });

    if (!result.success) {
      throw new Error(result.error || 'Échec du test SMTP');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email de test envoyé avec succès à ${company.smtp_username}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error testing SMTP:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur lors du test SMTP'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
