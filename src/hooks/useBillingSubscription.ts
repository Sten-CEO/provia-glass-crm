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

      // If ownerUserId is provided, use it. Otherwise, get the current user.
      let userId = ownerUserId;

      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSubscription(null);
          setLoading(false);
          return;
        }
        userId = user.id;
      }

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
 */
export async function getCompanyOwnerUserId(companyId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('role', 'owner')
      .maybeSingle();

    if (error || !data) {
      console.error('[Billing] Error getting company owner:', error);
      return null;
    }

    return data.user_id;
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
    const response = await fetch('https://proviabase.fr/api/seats/set', {
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
