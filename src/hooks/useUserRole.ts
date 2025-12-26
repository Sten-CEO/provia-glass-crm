import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "owner" | "manager" | "employee" | "backoffice" | "employe_terrain" | null;

interface UserRoleData {
  role: UserRole;
  companyId: string | null;
  loading: boolean;
}

export function useUserRole(): UserRoleData {
  const [role, setRole] = useState<UserRole>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setCompanyId(null);
        setLoading(false);
        return;
      }

      // Get user role and company from user_roles table
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role, company_id")
        .eq("user_id", user.id)
        .single();

      if (userRole) {
        console.log('[useUserRole] User role data:', { userId: user.id, role: userRole.role, companyId: userRole.company_id });
        setRole(userRole.role as UserRole);
        setCompanyId(userRole.company_id);
      } else {
        console.log('[useUserRole] No role found for user:', user.id);
        setRole(null);
        setCompanyId(null);
      }
    } catch (error) {
      console.error("Error loading user role:", error);
      setRole(null);
      setCompanyId(null);
    } finally {
      setLoading(false);
    }
  };

  return { role, companyId, loading };
}
