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

    // Listen for manual refresh events
    const handleRefresh = () => loadCompany();
    window.addEventListener('company-updated', handleRefresh);

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
      window.removeEventListener('company-updated', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCompany = async () => {
    try {
      console.log('🟢 [useCompany] Loading company...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ [useCompany] No user found');
        setLoading(false);
        return;
      }
      console.log('✅ [useCompany] User found:', user.id);

      // Get company_id from user_roles (single source of truth)
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error("❌ [useCompany] Error fetching user role:", roleError);
        setLoading(false);
        return;
      }

      if (!userRole?.company_id) {
        console.warn("⚠️ [useCompany] No company_id found for user, userRole:", userRole);
        setLoading(false);
        return;
      }

      console.log('✅ [useCompany] Company ID found:', userRole.company_id);

      // Get company settings using the company_id from user_roles
      const { data: settings, error: settingsError } = await supabase
        .from("company_settings")
        .select("company_name, country")
        .eq("company_id", userRole.company_id)
        .maybeSingle();

      if (settingsError) {
        console.error("❌ [useCompany] Error fetching company settings:", settingsError);
        setLoading(false);
        return;
      }

      console.log('📊 [useCompany] Company settings:', settings);

      if (settings) {
        const companyData = {
          id: userRole.company_id,
          name: settings.company_name,
          country: settings.country,
          currency: 'EUR' // Default currency
        };
        console.log('✅ [useCompany] Setting company:', companyData);
        setCompany(companyData);
      } else {
        console.warn("⚠️ [useCompany] No company settings found for company_id:", userRole.company_id);
        // Still set company with just the ID so it can be used
        const companyData = {
          id: userRole.company_id,
          name: 'Entreprise',
          country: null,
          currency: 'EUR'
        };
        console.log('⚠️ [useCompany] Setting company with default name:', companyData);
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
