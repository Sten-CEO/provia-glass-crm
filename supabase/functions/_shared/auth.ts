/**
 * Authentication Utilities for Edge Functions
 *
 * Provides secure JWT validation using Supabase Auth.
 * Never manually decode JWT without verification!
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AuthResult {
  userId: string;
  email?: string;
  error?: string;
}

/**
 * Validate JWT token and return user info
 * Uses Supabase Auth to cryptographically verify the token
 */
export async function validateAuthToken(
  request: Request,
  supabaseAdmin: SupabaseClient
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: '', error: 'Token d\'authentification manquant' };
  }

  const token = authHeader.replace('Bearer ', '');

  // Use Supabase Auth to verify the token cryptographically
  // This validates the signature, expiration, and other claims
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error('Token validation error:', error?.message);
    return { userId: '', error: 'Token invalide ou expiré' };
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

/**
 * Get user's company ID from user_roles table
 */
export async function getUserCompanyId(
  userId: string,
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('company_id')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user company:', error?.message);
    return null;
  }

  return data.company_id;
}

/**
 * Validate auth and get company ID in one call
 */
export async function validateAuthAndGetCompany(
  request: Request,
  supabaseAdmin: SupabaseClient
): Promise<{ userId: string; companyId: string; error?: string }> {
  const authResult = await validateAuthToken(request, supabaseAdmin);

  if (authResult.error) {
    return { userId: '', companyId: '', error: authResult.error };
  }

  const companyId = await getUserCompanyId(authResult.userId, supabaseAdmin);

  if (!companyId) {
    return { userId: authResult.userId, companyId: '', error: 'Société non trouvée pour cet utilisateur' };
  }

  return { userId: authResult.userId, companyId };
}

/**
 * Create a Supabase Admin client with service role key
 */
export function createSupabaseAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
