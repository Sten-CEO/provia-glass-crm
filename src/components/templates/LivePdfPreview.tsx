import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { renderQuoteHTML } from "@/lib/quote-template-renderer";
import { DocumentTemplate } from "@/hooks/useDocumentTemplates";

interface LivePdfPreviewProps {
  template: Partial<DocumentTemplate>;
  documentType?: "quote" | "invoice";
}

export function LivePdfPreview({
  template,
  documentType = "quote",
}: LivePdfPreviewProps) {
  // Créer des données d'exemple pour la preview
  const sampleQuoteData = {
    numero: "DEV-2025-0001",
    client_nom: "Jean Dupont",
    issued_at: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    total_ht: 1500,
    total_ttc: 1800,
    remise: template.show_discounts ? 100 : 0,
    required_deposit_ht: 0,
    title: "Installation de vitrerie",
    client_message: template.default_payment_method ? `Méthode de paiement : ${template.default_payment_method}` : "",
    lignes: [
      {
        name: "Prestation d'exemple",
        description: "Prestation d'exemple - Double vitrage",
        qty: 1,
        unit_price_ht: 1500,
        tva_rate: template.default_vat_rate || 20,
        total: 1500,
      },
    ],
    companies: {
      name: "Provia BASE",
      adresse: "123 Rue de la Vitrerie, 75001 Paris",
      telephone: "01 23 45 67 89",
      email: "contact@provia-glass.fr",
    },
    clients: {
      nom: "Jean Dupont",
      adresse: "456 Avenue du Client, 75002 Paris",
      telephone: "06 12 34 56 78",
      email: "jean.dupont@example.com",
    },
    property_address: "456 Avenue du Client, 75002 Paris",
    contact_phone: "06 12 34 56 78",
    contact_email: "jean.dupont@example.com",
  };

  // Générer le HTML avec useMemo pour forcer le re-render quand le template change
  const html = useMemo(() => {
    // Préparer le template avec les bonnes valeurs par défaut
    const templateData = {
      type: documentType === "quote" ? ("QUOTE" as const) : ("INVOICE" as const),
      header_logo: template.header_logo,
      header_layout: (template.header_layout as any) || "logo-left",
      logo_size: (template.logo_size as any) || "medium",
      main_color: template.main_color,
      accent_color: template.accent_color,
      background_style: (template.background_style as any) || "solid",
      font_family: template.font_family,
      show_vat: template.show_vat ?? true,
      show_discounts: template.show_discounts ?? false,
      show_remaining_balance: template.show_remaining_balance ?? false,
      signature_enabled: template.signature_enabled ?? false,
      header_html: template.header_html,
      content_html: template.content_html,
      footer_html: template.footer_html,
      css: template.css,
    };

    // Générer le HTML avec la fonction unifiée
    return renderQuoteHTML(templateData, sampleQuoteData as any);
  }, [
    documentType,
    template.header_logo,
    template.header_layout,
    template.logo_size,
    template.main_color,
    template.accent_color,
    template.background_style, // ← IMPORTANT : déclenche re-render quand changé
    template.font_family,
    template.show_vat,
    template.show_discounts,
    template.show_remaining_balance,
    template.signature_enabled,
    template.header_html,
    template.content_html,
    template.footer_html,
    template.css,
  ]);

  return (
    <Card className="overflow-hidden bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ maxHeight: "800px", overflowY: "auto" }}>
        {/* Afficher le HTML généré */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {/* Indicateur de preview */}
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-3 h-3" />
        <span>Aperçu du document avec données d'exemple - Rendu identique au PDF final</span>
      </div>

      {/* Message important */}
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
        💡 <strong>Astuce :</strong> Cette preview utilise exactement le même code que le PDF final.
        Tous les changements (style d'arrière-plan, disposition, couleurs) sont appliqués en temps réel.
      </div>
    </Card>
  );
}
