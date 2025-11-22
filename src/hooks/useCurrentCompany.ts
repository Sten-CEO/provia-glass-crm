import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrentCompanyData {
  companyId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get the current user's company ID.
 * This is the single source of truth for multi-tenant filtering.
 *
 * Usage:
 * const { companyId, loading } = useCurrentCompany();
 *
 * Then filter all queries with: .eq("company_id", companyId)
 */
export function useCurrentCompany(): CurrentCompanyData {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyId();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadCompanyId();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCompanyId = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCompanyId(null);
        setLoading(false);
        return;
      }

      // Get company_id from user_roles table
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (roleError) {
        console.error("Error fetching company_id:", roleError);
        setError("Impossible de récupérer votre société");
        setCompanyId(null);
      } else if (!userRole?.company_id) {
        console.warn("No company_id found for user");
        setError("Aucune société associée à votre compte");
        setCompanyId(null);
      } else {
        setCompanyId(userRole.company_id);
      }
    } catch (err) {
      console.error("Error loading company:", err);
      setError("Erreur lors du chargement de la société");
      setCompanyId(null);
    } finally {
      setLoading(false);
    }
  };

  return { companyId, loading, error };
}
