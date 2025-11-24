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

      // Get access_controls from equipe table for ALL roles (including owner/admin)
      // NO automatic full access anymore
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
    // NO automatic access for any role - always check access_controls
    // If no access controls defined, deny access
    if (!accessControls) {
      return false;
    }

    return accessControls[feature] ?? false;
  };

  return { accessControls, loading, userRole, hasAccess };
}
