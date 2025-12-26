import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'inactive' | null;

interface BillingSubscription {
  user_id: string;
  status: SubscriptionStatus;
  quantity: number;
  current_period_end: string | null;
}

interface UseBillingSubscriptionResult {
  subscription: BillingSubscription | null;
  loading: boolean;
  error: string | null;
  isActive: boolean;
  seatsAvailable: number;
  refreshSubscription: () => Promise<void>;
}

/**
 * Hook to check the user's billing subscription status
 * Uses the billing_subscriptions table from Supabase
 */
export function useBillingSubscription(ownerUserId?: string): UseBillingSubscriptionResult {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // IMPORTANT: Only check subscription if ownerUserId is explicitly provided
      // This prevents the bug where members are blocked because the hook
      // falls back to checking their own subscription (which doesn't exist)
      // Members should only be checked via their company owner's subscription
      if (!ownerUserId) {
        // No ownerUserId provided - don't block access
        // The AuthGuard handles this case with its own logic
        console.log('[Billing] No ownerUserId provided, skipping subscription check');
        setSubscription(null);
        setLoading(false);
        return;
      }

      console.log('[Billing] Checking subscription for owner:', ownerUserId);
      const userId = ownerUserId;

      // Fetch subscription from billing_subscriptions table
      const { data, error: fetchError } = await supabase
        .from('billing_subscriptions' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        // Handle table not existing or other errors
        if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist')) {
          console.warn('[Billing] billing_subscriptions table does not exist');
          setError('Table billing_subscriptions non trouvée');
          setSubscription(null);
        } else if (fetchError.code !== 'PGRST116') {
          console.error('[Billing] Error fetching subscription:', fetchError);
          setError('Erreur lors de la vérification de l\'abonnement');
        }
        setLoading(false);
        return;
      }

      console.log('[Billing] Subscription data for owner', ownerUserId, ':', data);
      setSubscription(data as BillingSubscription | null);
    } catch (err) {
      console.error('[Billing] Unexpected error:', err);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  }, [ownerUserId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if subscription is active (active or trialing)
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  // Get available seats (default to 1 if no subscription)
  const seatsAvailable = subscription?.quantity || 1;

  return {
    subscription,
    loading,
    error,
    isActive,
    seatsAvailable,
    refreshSubscription: fetchSubscription,
  };
}

/**
 * Get the owner user ID for a company
 * This is needed because billing is tied to the owner, not individual users
 * Uses companies.owner_id as the source of truth
 */
export async function getCompanyOwnerUserId(companyId: string): Promise<string | null> {
  try {
    console.log('[Billing] Getting owner for company:', companyId);

    // Use RPC function that bypasses RLS to get the owner
    // This is necessary because members can't see other users' roles due to RLS
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_company_owner_user_id', { p_company_id: companyId });

    console.log('[Billing] RPC get_company_owner_user_id result:', { rpcData, rpcError });

    if (rpcData) {
      console.log('[Billing] Found owner from RPC:', rpcData);
      return rpcData;
    }

    if (rpcError) {
      console.warn('[Billing] RPC failed, falling back to direct queries:', rpcError.message);
    }

    // Fallback: try user_roles directly (may work depending on RLS)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('role', 'owner')
      .maybeSingle();

    console.log('[Billing] user_roles owner result:', { roleData, roleError });

    if (roleData?.user_id) {
      console.log('[Billing] Found owner from user_roles:', roleData.user_id);
      return roleData.user_id;
    }

    // Last fallback: try companies.owner_id
    const { data, error } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', companyId)
      .maybeSingle();

    console.log('[Billing] companies.owner_id result:', { data, error });

    if (data?.owner_id) {
      console.log('[Billing] Found owner_id from companies:', data.owner_id);
      return data.owner_id;
    }

    console.error('[Billing] Could not find company owner from any source');
    return null;
  } catch (err) {
    console.error('[Billing] Unexpected error getting company owner:', err);
    return null;
  }
}

/**
 * Count active members in a company
 */
export async function countActiveMembers(companyId: string): Promise<number> {
  try {
    const { data, error, count } = await supabase
      .from('equipe')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (error) {
      console.error('[Billing] Error counting members:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('[Billing] Unexpected error counting members:', err);
    return 0;
  }
}

/**
 * Update seats on the billing platform
 * Call this after adding/removing team members
 */
export async function updateBillingSeats(ownerUserId: string, activeSeats: number): Promise<{
  success: boolean;
  previousQuantity?: number;
  newQuantity?: number;
  isUpgrade?: boolean;
  error?: string;
}> {
  try {
    // Use www subdomain to avoid CORS redirect issues
    const response = await fetch('https://www.proviabase.fr/api/seats/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: ownerUserId,
        activeSeats: activeSeats,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Billing] Error updating seats:', errorData);
      return {
        success: false,
        error: errorData.message || 'Erreur lors de la mise à jour des sièges',
      };
    }

    const result = await response.json();
    return {
      success: true,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      isUpgrade: result.isUpgrade,
    };
  } catch (err) {
    console.error('[Billing] Unexpected error updating seats:', err);
    return {
      success: false,
      error: 'Une erreur inattendue s\'est produite',
    };
  }
}
