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
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.company_id) {
        setLoading(false);
        return;
      }

      // Get company settings using the company_id from user_roles
      const { data: settings } = await supabase
        .from("company_settings")
        .select("company_name, country")
        .eq("company_id", userRole.company_id)
        .single();

      if (settings) {
        setCompany({
          id: userRole.company_id,
          name: settings.company_name,
          country: settings.country,
          currency: 'EUR' // Default currency
        });
      }
    } catch (error) {
      console.error("Error loading company:", error);
    } finally {
      setLoading(false);
    }
  };

  return { company, loading };
}
