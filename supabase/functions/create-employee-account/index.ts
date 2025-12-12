import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

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

    // Récupérer le company_id et role de l'utilisateur qui crée le membre
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', callingUser.id)
      .single();

    if (!callerRole) {
      throw new Error('User role not found');
    }

    // Only owner, admin, and manager can create team members
    if (!['owner', 'admin', 'manager'].includes(callerRole.role)) {
      throw new Error('Insufficient permissions - owner, admin, or manager role required');
    }

    const companyId = callerRole.company_id;
    if (!companyId) {
      throw new Error('User has no company assigned');
    }

    const { employeeId, email, password, firstName, lastName, phone, sendEmail } = await req.json();

    if (!employeeId || !email) {
      throw new Error('Missing required fields: employeeId and email are required');
    }

    if (!password || password.trim().length < 6) {
      throw new Error('Password is required and must be at least 6 characters');
    }

    // Récupérer le rôle depuis la table equipe
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('equipe')
      .select('role, company_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employeeData) {
      console.error('Error fetching employee:', employeeError);
      throw new Error('Employee not found');
    }

    // Mapper le rôle UI vers le rôle DB
    const roleMapping: Record<string, string> = {
      'Owner': 'owner',
      'Admin': 'admin',
      'Manager': 'manager',
      'Backoffice': 'backoffice',
      'Employé terrain': 'employe_terrain',
    };

    const employeeRole = employeeData.role || 'Employé terrain';
    const dbRole = roleMapping[employeeRole] || 'employe_terrain';

    // Vérifier que l'employé appartient à la même company
    if (employeeData.company_id !== companyId) {
      throw new Error('Employee belongs to a different company');
    }

    // Créer l'utilisateur Supabase (ne déclenche PAS handle_new_user car c'est admin.createUser)
    const { data: newUser, error: createError} = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        is_employee: true, // Flag pour éviter création company
        role: dbRole,
      },
      app_metadata: {
        provider: 'email',
        role: dbRole,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    // Lier l'utilisateur à l'équipe avec le même company_id
    const { error: updateError } = await supabaseAdmin
      .from('equipe')
      .update({
        user_id: newUser.user.id,
        phone: phone || null,
        status: 'active',
        app_access_status: dbRole === 'employe_terrain' ? 'active' : 'none',
        company_id: companyId,
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('❌ Error updating equipe:', updateError);
      // Supprimer l'utilisateur créé si la liaison échoue
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw updateError;
    }

    // Créer le rôle dans user_roles avec le rôle déterminé depuis la table equipe
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        company_id: companyId,
        role: dbRole,
      });

    if (roleError) {
      console.error('❌ Error creating role:', roleError);
      // Supprimer l'utilisateur créé si la création du rôle échoue
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error('Failed to create user role: ' + roleError.message);
    }

    // TODO: Envoyer l'email d'invitation si sendEmail === true
    // Nécessite l'intégration Resend

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        role: dbRole,
        email: email,
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
