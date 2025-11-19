import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Vérifier que l'utilisateur appelant est admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      throw new Error('Unauthorized');
    }

    // Récupérer le company_id de l'admin qui crée l'employé
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      throw new Error('Insufficient permissions - admin role required');
    }

    const adminCompanyId = adminRole.company_id;
    if (!adminCompanyId) {
      throw new Error('Admin has no company assigned');
    }

    const { employeeId, email, password, firstName, lastName, phone, sendEmail } = await req.json();

    if (!employeeId || !email) {
      throw new Error('Missing required fields');
    }

    // Créer l'utilisateur Supabase (ne déclenche PAS handle_new_user car c'est admin.createUser)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        is_employee: true, // Flag pour éviter création company
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created:', newUser.user.id);

    // Lier l'utilisateur à l'équipe avec le même company_id que l'admin
    const { error: updateError } = await supabaseAdmin
      .from('equipe')
      .update({ 
        user_id: newUser.user.id,
        phone: phone || null,
        status: 'active',
        app_access_status: 'active',
        company_id: adminCompanyId, // Même company que l'admin
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error updating equipe:', updateError);
      // Supprimer l'utilisateur créé si la liaison échoue
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw updateError;
    }

    // Créer le rôle employee avec le company_id de l'admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        company_id: adminCompanyId, // Même company que l'admin
        role: 'employee',
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Ne pas fail complètement, juste logger
    }

    // TODO: Envoyer l'email d'invitation si sendEmail === true
    // Nécessite l'intégration Resend

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        temporaryPassword: password || null,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-employee-account:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
