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
  tableau_de_bord?: boolean;  // Access to view the dashboard page
  chiffre_affaire?: boolean;   // Access to view revenue/CA on dashboard (formerly "dashboard")
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
      console.log('🟢 [useAccessControls.TS] Loading access controls...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ [useAccessControls.TS] No user found');
        setAccessControls(null);
        setUserRole(null);
        setLoading(false);
        return;
      }
      console.log('✅ [useAccessControls.TS] User found:', user.id);

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
      console.log('👤 [useAccessControls.TS] User role:', userRoleData.role);

      // OWNER and ADMIN have automatic full access
      if (userRoleData.role === 'owner' || userRoleData.role === 'admin') {
        console.log('✅ [useAccessControls.TS] Owner/Admin detected - granting full access');
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
          tableau_de_bord: true,
          chiffre_affaire: true,
        });
        setLoading(false);
        return;
      }

      // For all other roles (admin, manager, backoffice, employe_terrain)
      // Get access_controls from equipe table
      const { data: equipeData, error: equipeError } = await supabase
        .from("equipe")
        .select("access_controls")
        .eq("user_id", user.id)
        .maybeSingle();

      if (equipeError) {
        console.error("❌ [useAccessControls.TS] Error fetching access controls:", equipeError);
      }

      if (equipeData?.access_controls) {
        console.log('✅ [useAccessControls.TS] Access controls loaded:', JSON.stringify(equipeData.access_controls, null, 2));
        setAccessControls(equipeData.access_controls as AccessControls);
      } else {
        console.log('⚠️ [useAccessControls.TS] No access_controls found, setting empty object');
        // NO default access - if no access_controls defined, user has NO access
        setAccessControls({});
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
    // Owner and Admin always have access to everything
    if (userRole === 'owner' || userRole === 'admin') {
      return true;
    }

    // For all other roles, check access_controls
    if (!accessControls) {
      return false;
    }

    return accessControls[feature] ?? false;
  };

  return { accessControls, loading, userRole, hasAccess };
}
