import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SignInvoiceRequest {
  token: string;
  signerName: string;
  signerEmail?: string;
  signatureImage?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { token, signerName, signerEmail, signatureImage }: SignInvoiceRequest = await req.json();

    if (!token || !signerName) {
      throw new Error('Token et nom du signataire requis');
    }

    if (!signatureImage) {
      throw new Error('Signature requise');
    }

    // Valider le format de la signature (doit être une image base64 valide)
    const signatureRegex = /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/;
    if (!signatureRegex.test(signatureImage)) {
      throw new Error('Format de signature invalide');
    }

    // Limiter la taille de la signature (max 5MB)
    const base64Data = signatureImage.split(',')[1] || '';
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (sizeInBytes > maxSizeBytes) {
      throw new Error('Signature trop volumineuse (max 5MB)');
    }

    // Créer le client Supabase avec SERVICE_ROLE_KEY pour accès public
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer la facture par token
    const { data: invoice, error: invoiceError } = await supabase
      .from('factures')
      .select('id, numero, statut, echeance')
      .eq('token', token)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice error:', invoiceError);
      throw new Error('Facture introuvable ou lien invalide');
    }

    // Vérifier si la facture n'est pas déjà signée
    const { data: existingSignature } = await supabase
      .from('invoice_signatures')
      .select('id')
      .eq('invoice_id', invoice.id)
      .maybeSingle();

    if (existingSignature) {
      throw new Error('Cette facture a déjà été validée');
    }

    // Récupérer l'IP et User-Agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Créer la signature
    const { error: signatureError } = await supabase
      .from('invoice_signatures')
      .insert({
        invoice_id: invoice.id,
        signer_name: signerName,
        signer_email: signerEmail || null,
        signature_image_url: signatureImage,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (signatureError) {
      console.error('Signature error:', signatureError);
      throw new Error('Erreur lors de l\'enregistrement de la validation');
    }

    // Mettre à jour la facture avec la date de signature
    const { error: updateError } = await supabase
      .from('factures')
      .update({
        signed_at: new Date().toISOString()
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Erreur lors de la mise à jour');
    }

    // Récupérer le company_id de la facture pour créer la notification
    const { data: invoiceDetails } = await supabase
      .from('factures')
      .select('company_id, client_nom')
      .eq('id', invoice.id)
      .single();

    // Créer une notification pour la validation de la facture
    if (invoiceDetails?.company_id) {
      await supabase.from('notifications').insert({
        company_id: invoiceDetails.company_id,
        type: 'invoice_signed',
        title: 'Facture validée',
        message: `La facture ${invoice.numero} a été validée électroniquement par ${signerName}${invoiceDetails.client_nom ? ` (${invoiceDetails.client_nom})` : ''}.`,
        payload: {
          invoice_id: invoice.id,
          invoice_numero: invoice.numero,
          signer_name: signerName,
          link: `/factures/${invoice.id}`
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Facture validée avec succès',
        invoice: {
          numero: invoice.numero,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error signing invoice:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la validation de la facture' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
