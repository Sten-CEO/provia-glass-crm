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

    // Listen for real-time changes
    const channel = supabase
      .channel('company-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'companies'
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

      // Get user's company via user_roles
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.company_id) {
        setLoading(false);
        return;
      }

      // Get company details
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, name, country, currency")
        .eq("id", userRole.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
      }
    } catch (error) {
      console.error("Error loading company:", error);
    } finally {
      setLoading(false);
    }
  };

  return { company, loading };
}
