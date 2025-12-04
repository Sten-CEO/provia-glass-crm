import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { toast } from "sonner";

export interface DocumentTemplate {
  id: string;
  company_id: string;
  type: "QUOTE" | "INVOICE" | "EMAIL";
  name: string;
  is_default: boolean;

  // Appearance
  theme: string;
  main_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  background_style: string | null;
  header_layout: string | null;

  // Logo
  header_logo: string | null;
  logo_position: string | null;
  logo_size: string | null;

  // Content
  header_html: string | null;
  content_html: string;
  footer_html: string | null;
  css: string | null;

  // Email specific
  email_subject: string | null;
  email_body: string | null;
  email_type: string | null;

  // Options
  show_vat: boolean;
  show_discounts: boolean;
  show_remaining_balance: boolean;
  signature_enabled: boolean;

  // New fields
  table_columns: Record<string, boolean> | null;
  default_vat_rate: number | null;
  default_payment_method: string | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export type TemplateType = "QUOTE" | "INVOICE" | "EMAIL";
export type EmailTemplateType = "quote" | "invoice" | "reminder";

interface UseDocumentTemplatesOptions {
  type?: TemplateType;
  emailType?: EmailTemplateType;
  autoLoad?: boolean;
}

export function useDocumentTemplates(options: UseDocumentTemplatesOptions = {}) {
  const { type, emailType, autoLoad = true } = options;
  const { companyId } = useCurrentCompany();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load templates from database
   */
  const loadTemplates = useCallback(async () => {
    if (!companyId && !autoLoad) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("doc_templates")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by company if provided
      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      // Filter by type if provided
      if (type) {
        query = query.eq("type", type);
      }

      // Filter by email type if provided
      if (emailType && type === "EMAIL") {
        query = query.eq("email_type", emailType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTemplates(data || []);

      // Find default template
      const defaultTpl = data?.find((t) => t.is_default) || null;
      setDefaultTemplate(defaultTpl);
    } catch (err: any) {
      console.error("Error loading templates:", err);
      setError(err.message || "Erreur lors du chargement des modèles");
      toast.error("Impossible de charger les modèles");
    } finally {
      setLoading(false);
    }
  }, [companyId, type, emailType, autoLoad]);

  /**
   * Create a new template
   */
  const createTemplate = async (
    templateData: Partial<DocumentTemplate>
  ): Promise<DocumentTemplate | null> => {
    if (!companyId) {
      toast.error("Impossible de déterminer votre société");
      return null;
    }

    try {
      const newTemplate: any = {
        company_id: companyId,
        type: templateData.type || "QUOTE",
        name: templateData.name || "Nouveau modèle",
        theme: templateData.theme || "classique",
        main_color: templateData.main_color || "#3b82f6",
        accent_color: templateData.accent_color || "#fbbf24",
        font_family: templateData.font_family || "Arial",
        background_style: templateData.background_style || "solid",
        header_layout: templateData.header_layout || "logo-left",
        header_logo: templateData.header_logo || null,
        logo_position: templateData.logo_position || "left",
        logo_size: templateData.logo_size || "medium",
        show_vat: templateData.show_vat ?? true,
        show_discounts: templateData.show_discounts ?? true,
        show_remaining_balance: templateData.show_remaining_balance ?? false,
        signature_enabled: templateData.signature_enabled ?? false,
        email_subject: templateData.email_subject || null,
        email_body: templateData.email_body || null,
        email_type: templateData.email_type || null,
        content_html: templateData.content_html || '<div style="padding: 20px;">Contenu du document</div>',
        header_html: templateData.header_html || null,
        footer_html: templateData.footer_html || null,
        css: templateData.css || null,
        is_default: templateData.is_default ?? false,
        table_columns: templateData.table_columns || {
          description: true,
          reference: true,
          quantity: true,
          days: false,
          unit: true,
          unit_price_ht: true,
          vat_rate: true,
          discount: false,
          total_ht: true,
          total_ttc: true,
        },
        default_vat_rate: templateData.default_vat_rate ?? 20.0,
        default_payment_method: templateData.default_payment_method || "Virement bancaire",
      };

      const { data, error: insertError } = await supabase
        .from("doc_templates")
        .insert(newTemplate)
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Modèle créé avec succès");
      await loadTemplates();

      return data;
    } catch (err: any) {
      console.error("Error creating template:", err);
      toast.error(`Erreur lors de la création : ${err.message}`);
      return null;
    }
  };

  /**
   * Update an existing template
   */
  const updateTemplate = async (
    id: string,
    updates: Partial<DocumentTemplate>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("doc_templates")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("Modèle mis à jour avec succès");
      await loadTemplates();

      return true;
    } catch (err: any) {
      console.error("Error updating template:", err);
      toast.error(`Erreur lors de la mise à jour : ${err.message}`);
      return false;
    }
  };

  /**
   * Delete a template
   */
  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("doc_templates")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      toast.success("Modèle supprimé");
      await loadTemplates();

      return true;
    } catch (err: any) {
      console.error("Error deleting template:", err);
      toast.error(`Erreur lors de la suppression : ${err.message}`);
      return false;
    }
  };

  /**
   * Set a template as default
   */
  const setAsDefault = async (id: string, templateType: TemplateType): Promise<boolean> => {
    try {
      // Remove default from all templates of this type
      await supabase
        .from("doc_templates")
        .update({ is_default: false })
        .eq("type", templateType)
        .eq("company_id", companyId);

      // Set the new default
      const { error: updateError } = await supabase
        .from("doc_templates")
        .update({ is_default: true })
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("Modèle défini par défaut");
      await loadTemplates();

      return true;
    } catch (err: any) {
      console.error("Error setting default template:", err);
      toast.error("Erreur lors de la mise à jour");
      return false;
    }
  };

  /**
   * Duplicate a template
   */
  const duplicateTemplate = async (template: DocumentTemplate): Promise<DocumentTemplate | null> => {
    const duplicated: Partial<DocumentTemplate> = {
      ...template,
      id: undefined,
      name: `${template.name} (copie)`,
      is_default: false,
      created_at: undefined,
      updated_at: undefined,
    };

    return await createTemplate(duplicated);
  };

  /**
   * Get a template by ID
   */
  const getTemplateById = async (id: string): Promise<DocumentTemplate | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from("doc_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err: any) {
      console.error("Error fetching template:", err);
      return null;
    }
  };

  /**
   * Get default template for a type
   */
  const getDefaultTemplate = async (
    templateType: TemplateType,
    emailTemplateType?: EmailTemplateType
  ): Promise<DocumentTemplate | null> => {
    try {
      let query = supabase
        .from("doc_templates")
        .select("*")
        .eq("type", templateType)
        .eq("is_default", true);

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      if (emailTemplateType && templateType === "EMAIL") {
        query = query.eq("email_type", emailTemplateType);
      }

      const { data, error: fetchError } = await query.single();

      if (fetchError) {
        // No default template found, that's ok
        return null;
      }

      return data;
    } catch (err: any) {
      console.error("Error fetching default template:", err);
      return null;
    }
  };

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
    }
  }, [autoLoad, loadTemplates]);

  return {
    // State
    templates,
    defaultTemplate,
    loading,
    error,

    // Actions
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setAsDefault,
    duplicateTemplate,
    getTemplateById,
    getDefaultTemplate,
  };
}
