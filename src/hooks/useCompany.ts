import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
  country: string | null;
  currency: string | null;
}

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();

    // Listen for real-time changes on company_settings
    const channel = supabase
      .channel('company-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'company_settings'
      }, () => {
        loadCompany();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCompany = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get company_id from user_roles (single source of truth)
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        setLoading(false);
        return;
      }

      if (!userRole?.company_id) {
        console.warn("No company_id found for user");
        setLoading(false);
        return;
      }

      // Get company settings using the company_id from user_roles
      const { data: settings, error: settingsError } = await supabase
        .from("company_settings")
        .select("company_name, country")
        .eq("company_id", userRole.company_id)
        .maybeSingle();

      if (settingsError) {
        console.error("Error fetching company settings:", settingsError);
        setLoading(false);
        return;
      }

      if (settings) {
        setCompany({
          id: userRole.company_id,
          name: settings.company_name,
          country: settings.country,
          currency: 'EUR' // Default currency
        });
      } else {
        console.warn("No company settings found for company_id:", userRole.company_id);
      }
    } catch (error) {
      console.error("Error loading company:", error);
    } finally {
      setLoading(false);
    }
  };

  return { company, loading };
}
