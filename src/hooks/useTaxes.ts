import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTaxes() {
  return useQuery({
    queryKey: ["taxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxes")
        .select("*")
        .eq("is_active", true)
        .order("rate", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useDefaultTax() {
  return useQuery({
    queryKey: ["taxes", "default"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxes")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
