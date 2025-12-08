import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && templateId) {
      loadTemplate();
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
    } finally {
      setLoading(false);
    }
  };

  const replaceVariables = (text: string) => {
    if (!text) return "";

    const companyName = documentData.companies?.name || "Provia BASE";
    const totalHT = `${(documentData.total_ht || 0).toFixed(2)} €`;
    const totalTTC = `${(documentData.total_ttc || 0).toFixed(2)} €`;
    const date = documentData.issued_at || documentData.issue_date || new Date().toLocaleDateString("fr-FR");
    const dueDate = documentData.expiry_date || documentData.echeance || "";

    return text
      // English variables with single braces
      .replace(/{company_name}/g, companyName)
      .replace(/{client_name}/g, documentData.client_nom || "Client")
      .replace(/{document_number}/g, documentData.numero || "")
      .replace(/{total_ht}/g, totalHT)
      .replace(/{total_ttc}/g, totalTTC)
      .replace(/{date}/g, date)
      .replace(/{due_date}/g, dueDate)
      .replace(/{property_address}/g, documentData.property_address || documentData.adresse || "")
      .replace(/{contact_phone}/g, documentData.contact_phone || documentData.telephone || "")
      .replace(/{contact_email}/g, documentData.contact_email || documentData.email || "")
      .replace(/{document_type}/g, documentType === "QUOTE" ? "Devis" : "Facture")
      // French variables with double braces (pour compatibilité templates personnalisés)
      .replace(/\{\{NomEntreprise\}\}/g, companyName)
      .replace(/\{\{NomClient\}\}/g, documentData.client_nom || "Client")
      .replace(/\{\{EmailClient\}\}/g, documentData.contact_email || documentData.email || "")
      .replace(/\{\{TelephoneClient\}\}/g, documentData.contact_phone || documentData.telephone || "")
      .replace(/\{\{AdresseClient\}\}/g, documentData.property_address || documentData.adresse || "")
      .replace(/\{\{NumDevis\}\}/g, documentData.numero || "")
      .replace(/\{\{NumDocument\}\}/g, documentData.numero || "")
      .replace(/\{\{TypeDocument\}\}/g, documentType === "QUOTE" ? "Devis" : "Facture")
      .replace(/\{\{MontantHT\}\}/g, totalHT)
      .replace(/\{\{MontantTTC\}\}/g, totalTTC)
      .replace(/\{\{DateEnvoi\}\}/g, date)
      .replace(/\{\{DateCreation\}\}/g, date)
      .replace(/\{\{DateExpiration\}\}/g, dueDate);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !template) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chargement...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const logoSizeClass = template.logo_size === "small" ? "h-12" : template.logo_size === "large" ? "h-24" : "h-16";

  // Header layout classes based on template.header_layout
  const getHeaderLayoutClass = () => {
    switch (template.header_layout) {
      case "logo-center":
        return "flex flex-col items-center text-center";
      case "logo-right":
        return "flex flex-row-reverse items-center justify-between";
      case "split":
        return "grid grid-cols-2 gap-4";
      default: // logo-left
        return "flex items-center justify-between";
    }
  };

  const lines = documentData.lignes || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Aperçu PDF - {documentData.numero}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="pdf-preview-content">
          <style dangerouslySetInnerHTML={{ __html: template.css || "" }} />
          <div 
            className="bg-white p-8 rounded-lg shadow-lg"
            style={{ 
              fontFamily: template.font_family || "Arial",
              color: "#1a1a1a"
            }}
          >
            {/* En-tête avec logo et titre selon le layout */}
            {template.header_logo && (
              <div className={`${getHeaderLayoutClass()} pb-4 border-b-2 mb-6`} style={{ borderColor: template.main_color || "#3b82f6" }}>
                <div className="flex items-center gap-4">
                  <img
                    src={template.header_logo}
                    alt="Logo"
                    className={`${logoSizeClass} object-contain`}
                  />
                </div>
                <div className={template.header_layout === "logo-center" ? "mt-4" : ""}>
                  <h1 className="text-2xl font-bold" style={{ color: template.main_color || "#3b82f6" }}>
                    {documentType === "QUOTE" ? "DEVIS" : "FACTURE"}
                  </h1>
                  <p className="text-sm text-muted-foreground">N° {documentData.numero}</p>
                </div>
              </div>
            )}

            {/* En-tête HTML personnalisé */}
            {template.header_html && (
              <div 
                className="header mb-6"
                dangerouslySetInnerHTML={{ __html: replaceVariables(template.header_html) }}
              />
            )}

            {/* Informations du document */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <p className="font-semibold text-lg mb-2" style={{ color: template.main_color || "#3b82f6" }}>
                  {documentType === "QUOTE" ? "DEVIS" : "FACTURE"}
                </p>
                <p className="font-semibold">N° {documentData.numero}</p>
                <p>Date: {documentData.issued_at || documentData.issue_date || new Date().toLocaleDateString("fr-FR")}</p>
                {documentType === "QUOTE" && documentData.expiry_date && (
                  <p>Valable jusqu'au: {documentData.expiry_date}</p>
                )}
                {documentType === "INVOICE" && documentData.echeance && (
                  <p>Échéance: {documentData.echeance}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold mb-2">Client</p>
                <p className="font-medium">{documentData.client_nom}</p>
                {documentData.property_address && <p>{documentData.property_address}</p>}
                {documentData.contact_phone && <p>{documentData.contact_phone}</p>}
                {documentData.contact_email && <p>{documentData.contact_email}</p>}
              </div>
            </div>

            {/* Titre du devis */}
            {documentData.title && documentType === "QUOTE" && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold">{documentData.title}</h2>
              </div>
            )}

            {/* Corps du document - Tableau des lignes */}
            {template.content_html ? (
              <div 
                className="content mb-6"
                dangerouslySetInnerHTML={{ __html: replaceVariables(template.content_html) }}
              />
            ) : (
              <div className="mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: template.main_color || "#3b82f6" }}>
                      <th className="text-left py-2 px-2" style={{ color: template.main_color || "#3b82f6" }}>Description</th>
                      <th className="text-center py-2 px-2" style={{ color: template.main_color || "#3b82f6" }}>Qté</th>
                      <th className="text-right py-2 px-2" style={{ color: template.main_color || "#3b82f6" }}>P.U. HT</th>
                      {template.show_vat && <th className="text-center py-2 px-2" style={{ color: template.main_color || "#3b82f6" }}>TVA</th>}
                      <th className="text-right py-2 px-2" style={{ color: template.main_color || "#3b82f6" }}>Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line: any, idx: number) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 px-2">
                          <div className="font-medium">{line.name || line.description}</div>
                          {line.description && line.name !== line.description && (
                            <div className="text-xs text-muted-foreground">{line.description}</div>
                          )}
                        </td>
                        <td className="text-center py-2 px-2">{line.qty || line.quantite || 1}</td>
                        <td className="text-right py-2 px-2">{((line.unit_price_ht || line.prix_unitaire || 0)).toFixed(2)} €</td>
                        {template.show_vat && <td className="text-center py-2 px-2">{line.tva_rate || 20}%</td>}
                        <td className="text-right py-2 px-2">{(line.total || ((line.qty || line.quantite || 1) * (line.unit_price_ht || line.prix_unitaire || 0))).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totaux */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-end gap-8">
                <span>Total HT:</span>
                <span className="font-semibold min-w-[120px] text-right">{(documentData.total_ht || 0).toFixed(2)} €</span>
              </div>
              {template.show_discounts && documentData.remise > 0 && (
                <div className="flex justify-end gap-8 text-green-600">
                  <span>Remise:</span>
                  <span className="min-w-[120px] text-right">-{(documentData.remise || 0).toFixed(2)} €</span>
                </div>
              )}
              {template.show_vat && (
                <div className="flex justify-end gap-8">
                  <span>TVA:</span>
                  <span className="min-w-[120px] text-right">{((documentData.total_ttc || 0) - (documentData.total_ht || 0)).toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-end gap-8 text-lg font-bold pt-2 border-t-2" style={{ borderColor: template.main_color || "#3b82f6", color: template.main_color || "#3b82f6" }}>
                <span>Total TTC:</span>
                <span className="min-w-[120px] text-right">{(documentData.total_ttc || 0).toFixed(2)} €</span>
              </div>
              {documentType === "QUOTE" && documentData.required_deposit_ht > 0 && (
                <div className="flex justify-end gap-8 text-orange-600 font-semibold">
                  <span>Acompte requis:</span>
                  <span className="min-w-[120px] text-right">{(documentData.required_deposit_ht || 0).toFixed(2)} €</span>
                </div>
              )}
            </div>

            {/* Messages client */}
            {documentData.client_message && (
              <div className="mt-6 p-4 bg-muted/20 rounded">
                <p className="text-sm whitespace-pre-wrap">{documentData.client_message}</p>
              </div>
            )}

            {/* Conditions et notes légales */}
            {(documentData.conditions || documentData.notes_legal) && (
              <div className="mt-6 text-xs text-muted-foreground">
                <p className="whitespace-pre-wrap">{documentData.conditions || documentData.notes_legal}</p>
              </div>
            )}

            {/* Pied de page HTML personnalisé */}
            {template.footer_html && (
              <div 
                className="footer mt-6 pt-4 border-t text-xs text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: replaceVariables(template.footer_html) }}
              />
            )}

            {/* Zone de signature */}
            {template.signature_enabled && documentType === "QUOTE" && (
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm font-semibold mb-4">Bon pour accord</p>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Date et signature du client:</p>
                    <div className="h-20 border-b border-dashed"></div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Cachet de l'entreprise:</p>
                    <div className="h-20 border-b border-dashed"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <style>{`
        @media print {
          .pdf-preview-content {
            padding: 0;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </Dialog>
  );
};
