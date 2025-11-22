import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AccessControls {
  devis?: boolean;
  planning?: boolean;
  factures?: boolean;
  clients?: boolean;
  jobs?: boolean;
  timesheets?: boolean;
  paiements?: boolean;
  parametres?: boolean;
  equipe?: boolean;
  inventaire?: boolean;
  agenda?: boolean;
  dashboard?: boolean;
}

export function useAccessControls() {
  const [accessControls, setAccessControls] = useState<AccessControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadAccessControls();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadAccessControls();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAccessControls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessControls(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Get user's role and access_controls from user_roles table
      const { data: userRoleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || !userRoleData) {
        console.error("Error fetching user role:", roleError);
        setAccessControls(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUserRole(userRoleData.role);

      // owner and admin have full access to everything
      if (userRoleData.role === 'owner' || userRoleData.role === 'admin') {
        setAccessControls({
          devis: true,
          planning: true,
          factures: true,
          clients: true,
          jobs: true,
          timesheets: true,
          paiements: true,
          parametres: true,
          equipe: true,
          inventaire: true,
          agenda: true,
          dashboard: true,
        });
        setLoading(false);
        return;
      }

      // For other roles (manager, backoffice), get access_controls from equipe table
      const { data: equipeData, error: equipeError } = await supabase
        .from("equipe")
        .select("access_controls")
        .eq("user_id", user.id)
        .maybeSingle();

      if (equipeError) {
        console.error("Error fetching access controls:", equipeError);
      }

      if (equipeData?.access_controls) {
        setAccessControls(equipeData.access_controls as AccessControls);
      } else {
        // Default access for users without specific controls
        setAccessControls({
          devis: true,
          planning: true,
          factures: true,
          clients: true,
          jobs: true,
          timesheets: true,
          paiements: false,
          parametres: false,
          equipe: false,
          inventaire: true,
          agenda: true,
          dashboard: true,
        });
      }
    } catch (error) {
      console.error("Error loading access controls:", error);
      setAccessControls(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (feature: keyof AccessControls): boolean => {
    // owner and admin always have access
    if (userRole === 'owner' || userRole === 'admin') {
      return true;
    }

    // If no access controls defined, deny access
    if (!accessControls) {
      return false;
    }

    return accessControls[feature] ?? false;
  };

  return { accessControls, loading, userRole, hasAccess };
}
