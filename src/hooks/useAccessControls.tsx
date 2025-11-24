import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AccessControls {
  dashboard?: boolean;
  devis?: boolean;
  planning?: boolean;
  agenda?: boolean;
  jobs?: boolean;
  timesheets?: boolean;
  clients?: boolean;
  factures?: boolean;
  paiements?: boolean;
  inventaire?: boolean;
  equipe?: boolean;
  parametres?: boolean;
}

interface UserRoleData {
  role: string;
  access_controls: AccessControls;
}

/**
 * Hook to manage user access controls
 * Fetches the current user's role and access_controls from the equipe table
 */
export function useAccessControls() {
  const [accessControls, setAccessControls] = useState<AccessControls>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccessControls = async () => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Fetch user's role and access_controls from equipe table
        // Order by created_at DESC to get the most recent entry
        // This handles cases where there might be duplicate rows
        const { data: userDataArray, error } = await supabase
          .from('equipe')
          .select('role, access_controls, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        // Take the first (most recent) entry
        const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;

        if (error) {
          console.error('❌ Error fetching access controls:', error);
          setLoading(false);
          return;
        }

        console.log(`📊 Found ${userDataArray?.length || 0} row(s) in equipe table for user ${session.user.id}`);
        if (userDataArray && userDataArray.length > 1) {
          console.warn('⚠️ Multiple rows found! Using the most recent one:', userData);
          console.warn('   All rows:', userDataArray);
        }

        if (!userData) {
          console.warn('No user data found in equipe table');
          setLoading(false);
          return;
        }

        if (userData) {
          const role = userData.role;
          setUserRole(role);

          console.log('👤 User data loaded:', {
            role,
            access_controls: userData.access_controls,
            access_controls_keys: userData.access_controls ? Object.keys(userData.access_controls) : 'NULL',
            is_owner_or_admin: role === 'Owner' || role === 'Admin'
          });

          // Use access_controls from database
          // Owner and Admin get full access only if access_controls is not explicitly set
          if ((role === 'Owner' || role === 'Admin') && (!userData.access_controls || Object.keys(userData.access_controls).length === 0)) {
            console.log('✅ Owner/Admin with no explicit access_controls → Full access granted');
            setAccessControls({
              dashboard: true,
              devis: true,
              planning: true,
              agenda: true,
              jobs: true,
              timesheets: true,
              clients: true,
              factures: true,
              paiements: true,
              inventaire: true,
              equipe: true,
              parametres: true,
            });
          } else {
            // For all roles, use access_controls from database (even Owner/Admin if set)
            console.log('✅ Using access_controls from database:', userData.access_controls);
            setAccessControls(userData.access_controls || {});
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error in useAccessControls:', error);
        setLoading(false);
      }
    };

    fetchAccessControls();
  }, []);

  // Real-time listener for access_controls changes
  useEffect(() => {
    if (!userId) return;

    console.log('🔄 Setting up real-time listener for access controls changes');

    const channel = supabase
      .channel(`access_controls_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'equipe',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔄 Access controls updated in real-time:', payload.new);
          const newData = payload.new as any;

          setUserRole(newData.role);

          // Same logic as above: use access_controls from database
          if ((newData.role === 'Owner' || newData.role === 'Admin') && (!newData.access_controls || Object.keys(newData.access_controls).length === 0)) {
            setAccessControls({
              dashboard: true,
              devis: true,
              planning: true,
              agenda: true,
              jobs: true,
              timesheets: true,
              clients: true,
              factures: true,
              paiements: true,
              inventaire: true,
              equipe: true,
              parametres: true,
            });
          } else {
            setAccessControls(newData.access_controls || {});
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time listener');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /**
   * Check if user has access to a specific feature
   * @param accessKey - The key from AccessControls (e.g., 'devis', 'planning')
   * @returns boolean - true if user has access, false otherwise
   */
  const hasAccess = (accessKey: keyof AccessControls): boolean => {
    // During loading, allow access (to prevent flickering)
    if (loading) return true;

    // If no access controls set, deny access (except Owner/Admin)
    if (!accessControls || Object.keys(accessControls).length === 0) {
      return false;
    }

    // Check if the specific access is granted
    return accessControls[accessKey] === true;
  };

  return {
    accessControls,
    userRole,
    hasAccess,
    loading,
  };
}
