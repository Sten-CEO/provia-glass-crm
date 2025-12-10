import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateInvoicePDF } from '../_shared/pdf-generator.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface GenerateInvoicePDFRequest {
  invoiceId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { invoiceId }: GenerateInvoicePDFRequest = await req.json();

    if (!invoiceId) {
      throw new Error('ID de facture requis');
    }

    console.log('Generating PDF for invoice:', invoiceId);

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

    // Créer le client Supabase avec SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer le company_id de l'utilisateur
    let companyId: string | null = null;

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (userRole) {
      companyId = userRole.company_id;
    } else {
      // Essayer de récupérer depuis equipe si c'est un employé
      const { data: employee } = await supabase
        .from('equipe')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (employee) {
        companyId = employee.company_id;
      }
    }

    if (!companyId) {
      throw new Error('Société non trouvée pour cet utilisateur');
    }

    // Récupérer la facture avec les infos client
    const { data: invoice, error: invoiceError } = await supabase
      .from('factures')
      .select(`
        *,
        clients:client_id (nom, email, telephone, adresse, ville, code_postal),
        companies:company_id (*)
      `)
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice error:', invoiceError);
      throw new Error('Facture introuvable ou accès non autorisé');
    }

    // Générer le PDF
    const { buffer, filename } = await generateInvoicePDF(invoice, supabase);

    // Convertir le buffer en base64
    const base64 = btoa(String.fromCharCode(...buffer));

    console.log('PDF generated successfully:', filename);

    return new Response(
      JSON.stringify({
        success: true,
        pdf: {
          data: base64,
          filename: filename,
          contentType: 'text/html'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la génération du PDF' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
