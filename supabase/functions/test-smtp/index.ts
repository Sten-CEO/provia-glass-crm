import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { testSmtpConfiguration } from '../_shared/smtp-mailer.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    console.log('Testing SMTP configuration...');

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      throw new Error('Société non trouvée pour cet utilisateur');
    }

    const companyId = userRole.company_id;

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

    console.log('SMTP test successful');

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
