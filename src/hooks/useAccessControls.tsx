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

  useEffect(() => {
    const fetchAccessControls = async () => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        // Fetch user's role and access_controls from equipe table
        const { data: userData, error } = await supabase
          .from('equipe')
          .select('role, access_controls')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching access controls:', error);
          // Default: grant all access if error (fail-open for Owner/Admin)
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
          setLoading(false);
          return;
        }

        if (userData) {
          const role = userData.role;
          setUserRole(role);

          // Owner and Admin have full access by default
          if (role === 'Owner' || role === 'Admin') {
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
              ...userData.access_controls, // Allow override via access_controls
            });
          } else {
            // For other roles, use access_controls from database
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
