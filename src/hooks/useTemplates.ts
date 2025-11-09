import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Template {
  id: string;
  type: string;
  name: string;
  is_default: boolean;
  theme: string;
  header_logo: string | null;
  logo_position: string | null;
  logo_size: string | null;
  main_color: string | null;
  font_family: string | null;
  show_vat: boolean;
  show_discounts: boolean;
  show_remaining_balance: boolean;
  signature_enabled: boolean;
  email_subject: string | null;
  email_body: string | null;
  content_html: string;
  header_html: string | null;
  footer_html: string | null;
  css: string | null;
}

export function useTemplates(type: "quote" | "invoice" | "email") {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert to uppercase for database query
  const dbType = type.toUpperCase() as "QUOTE" | "INVOICE" | "EMAIL";

  useEffect(() => {
    loadTemplates();
  }, [type]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("doc_templates")
      .select("*")
      .eq("type", dbType)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading templates:", error);
      setLoading(false);
      return;
    }

    setTemplates(data || []);
    const defaultTpl = data?.find((t) => t.is_default);
    setDefaultTemplate(defaultTpl || null);
    setLoading(false);
  };

  return {
    templates,
    defaultTemplate,
    loading,
    reload: loadTemplates,
  };
}
