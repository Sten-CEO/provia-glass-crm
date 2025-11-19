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

      // Get company settings which includes company_name
      const { data: settings } = await supabase
        .from("company_settings")
        .select("company_name, country, company_id")
        .limit(1)
        .single();

      if (settings) {
        setCompany({
          id: settings.company_id || '',
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
