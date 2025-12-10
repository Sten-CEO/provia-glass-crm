/**
 * PdfPreviewModal - Aperçu PDF lors de la création/modification d'un devis
 *
 * Ce composant utilise le renderer unifié (quoteHtmlRenderer.ts) pour
 * garantir que l'aperçu est identique au PDF final envoyé au client.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentTemplate } from "@/hooks/useDocumentTemplates";
import {
  renderQuoteToHtml,
  QuoteRenderData,
  QuoteLine,
} from "@/lib/quoteHtmlRenderer";
import { sanitizeTemplateHtml } from "@/lib/sanitize";

interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "QUOTE" | "INVOICE";
  documentData: any;
  templateId: string | null;
}

export const PdfPreviewModal = ({
  open,
  onOpenChange,
  documentType,
  documentData,
  templateId,
}: PdfPreviewModalProps) => {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && templateId) {
      loadTemplate();
    } else if (open && !templateId) {
      // Charger le template par défaut si aucun n'est spécifié
      loadDefaultTemplate();
    }
  }, [open, templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("doc_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Erreur de chargement du modèle");
      // Utiliser un template par défaut
      setTemplate(getDefaultTemplate());
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("doc_templates")
        .select("*")
        .eq("type", documentType)
        .eq("is_default", true)
        .single();

      if (error || !data) {
        // Pas de template par défaut, utiliser un template minimal
        setTemplate(getDefaultTemplate());
      } else {
        setTemplate(data);
      }
    } catch (error) {
      console.error("Error loading default template:", error);
      setTemplate(getDefaultTemplate());
    } finally {
      setLoading(false);
    }
  };

  // Template par défaut si aucun n'est trouvé
  const getDefaultTemplate = (): DocumentTemplate => ({
    id: "default",
    company_id: "",
    type: documentType,
    name: "Modèle par défaut",
    is_default: true,
    theme: "classique",
    main_color: "#3b82f6",
    accent_color: "#fbbf24",
    font_family: "Arial",
    background_style: "solid",
    header_layout: "logo-left",
    header_logo: null,
    logo_position: "left",
    logo_size: "medium",
    header_html: null,
    content_html: "",
    footer_html: null,
    css: null,
    email_subject: null,
    email_body: null,
    email_type: null,
    show_vat: true,
    show_discounts: true,
    show_remaining_balance: false,
    signature_enabled: false,
    table_columns: {
      description: true,
      reference: false,
      quantity: true,
      unit: false,
      unit_price_ht: true,
      vat_rate: true,
      discount: false,
      total_ht: true,
    },
    default_vat_rate: 20,
    default_payment_method: null,
  });

  // Convertir les données du document au format attendu par le renderer
  const quoteRenderData: QuoteRenderData = useMemo(() => {
    const lines: QuoteLine[] = (documentData.lignes || []).map((line: any) => ({
      name: line.name || line.description,
      description: line.description,
      reference: line.reference,
      qty: line.qty || line.quantite || 1,
      unit: line.unit,
      unit_price_ht: line.unit_price_ht || line.prix_unitaire || 0,
      tva_rate: line.tva_rate || 20,
      discount: line.discount || 0,
      total: line.total || ((line.qty || line.quantite || 1) * (line.unit_price_ht || line.prix_unitaire || 0)),
    }));

    // Récupérer les infos entreprise
    const company = documentData.companies || {};

    return {
      numero: documentData.numero || "",
      title: documentData.title || documentData.titre || "",
      issued_at: documentData.issued_at || documentData.issue_date || new Date().toISOString(),
      expiry_date: documentData.expiry_date || documentData.echeance || "",

      client_nom: documentData.client_nom || "",
      client_email: documentData.contact_email || documentData.email || "",
      client_telephone: documentData.contact_phone || documentData.telephone || "",
      client_adresse: documentData.property_address || documentData.adresse || "",

      company_name: company.name || company.nom || "",
      company_email: company.email || "",
      company_telephone: company.telephone || company.phone || "",
      company_adresse: company.adresse || company.address || "",
      company_siret: company.siret || "",
      company_website: company.website || company.site_web || "",

      total_ht: documentData.total_ht || 0,
      total_ttc: documentData.total_ttc || 0,
      remise: documentData.remise || 0,
      acompte: documentData.required_deposit_ht || documentData.acompte || 0,

      lignes: lines,

      message_client: documentData.client_message || documentData.message_client || "",
      conditions: documentData.conditions || documentData.notes_legal || "",

      // Signature si présente
      signature: documentData.quote_signatures?.[0] ? {
        signed_at: documentData.quote_signatures[0].signed_at,
        signer_name: documentData.quote_signatures[0].signer_name,
        signature_image_url: documentData.quote_signatures[0].signature_image_url,
      } : undefined,
    };
  }, [documentData]);

  // Générer le HTML avec le renderer unifié
  const previewHtml = useMemo(() => {
    if (!template) return "";
    return renderQuoteToHtml(quoteRenderData, template, {
      documentType,
      mode: "preview",
    });
  }, [quoteRenderData, template, documentType]);

  const handlePrint = () => {
    // Créer une fenêtre d'impression avec le HTML
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(previewHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleDownload = () => {
    // Créer un blob HTML et le télécharger
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentType === "QUOTE" ? "Devis" : "Facture"}_${documentData.numero || "preview"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Document téléchargé");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement de l'aperçu...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Aperçu PDF - {documentData.numero}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="pdf-preview-container bg-gray-100 p-4 rounded-lg">
          <div
            ref={printRef}
            className="bg-white shadow-lg rounded-lg overflow-hidden"
            style={{ maxHeight: "calc(90vh - 150px)", overflow: "auto" }}
          >
            {/* Render the unified HTML (sanitized for XSS protection) */}
            <div
              className="quote-preview-content"
              dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(previewHtml) }}
            />
          </div>
        </div>
      </DialogContent>

      <style>{`
        @media print {
          .pdf-preview-container {
            padding: 0 !important;
            background: white !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </Dialog>
  );
};
