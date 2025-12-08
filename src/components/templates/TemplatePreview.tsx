import { Card } from "@/components/ui/card";
import { renderQuoteHTML } from "@/lib/quote-template-renderer";

interface TemplatePreviewProps {
  template: {
    type: string;
    theme: string;
    header_logo: string | null;
    header_layout?: string | null;
    logo_position: string | null;
    logo_size: string | null;
    main_color: string | null;
    font_family: string | null;
    show_vat: boolean;
    show_discounts: boolean;
    show_remaining_balance: boolean;
    signature_enabled: boolean;
    header_html: string | null;
    content_html: string;
    footer_html: string | null;
    css: string | null;
    email_subject: string | null;
    email_body: string | null;
  };
}

export const TemplatePreview = ({ template }: TemplatePreviewProps) => {
  // Remplacer les variables par des exemples
  const replaceVariables = (text: string) => {
    return text
      // English variables
      .replace(/{company_name}/g, "Provia BASE")
      .replace(/{client_name}/g, "Jean Dupont")
      .replace(/{document_number}/g, "DEV-2025-0001")
      .replace(/{total_ht}/g, "1 000,00 €")
      .replace(/{total_ttc}/g, "1 200,00 €")
      .replace(/{date}/g, new Date().toLocaleDateString("fr-FR"))
      .replace(/{due_date}/g, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"))
      .replace(/{document_type}/g, template.type === "QUOTE" ? "Devis" : "Facture")
      // French variables
      .replace(/\{\{NomEntreprise\}\}/g, "Provia BASE")
      .replace(/\{\{NomClient\}\}/g, "Jean Dupont")
      .replace(/\{\{NumDevis\}\}/g, "DEV-2025-0001")
      .replace(/\{\{NumDocument\}\}/g, "DEV-2025-0001")
      .replace(/\{\{MontantHT\}\}/g, "1 000,00 €")
      .replace(/\{\{MontantTTC\}\}/g, "1 200,00 €")
      .replace(/\{\{DateEnvoi\}\}/g, new Date().toLocaleDateString("fr-FR"))
      .replace(/\{\{DateExpiration\}\}/g, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"));
  };

  if (template.type === "EMAIL") {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-background">
          <div className="space-y-3">
            <div className="border-b pb-2">
              <p className="text-xs text-muted-foreground">Sujet:</p>
              <p className="font-medium">{replaceVariables(template.email_subject || "")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Corps du message:</p>
              <div
                className="prose prose-sm max-w-none whitespace-pre-wrap"
                style={{ fontFamily: template.font_family || "Arial" }}
              >
                {replaceVariables(template.email_body || "")}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Pour les templates de documents (QUOTE/INVOICE), utiliser la fonction unifiée
  const sampleQuoteData = {
    numero: "DEV-2025-0001",
    client_nom: "Jean Dupont",
    issued_at: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    total_ht: 1000,
    total_ttc: 1200,
    remise: template.show_discounts ? 100 : 0,
    required_deposit_ht: 0,
    lignes: [
      {
        name: "Prestation exemple",
        description: "Prestation exemple",
        qty: 1,
        unit_price_ht: 1000,
        tva_rate: 20,
        total: 1000,
      },
    ],
    companies: {
      name: "Provia BASE",
      adresse: "123 Rue Exemple, 75001 Paris",
      telephone: "01 23 45 67 89",
      email: "contact@provia.fr",
    },
    clients: {
      nom: "Jean Dupont",
      adresse: "123 Rue Exemple, 75001 Paris",
      telephone: "06 12 34 56 78",
      email: "jean.dupont@example.com",
    },
  };

  const templateData = {
    ...template,
    header_layout: template.header_layout || template.logo_position || 'logo-left',
  };

  const html = renderQuoteHTML(templateData as any, sampleQuoteData as any);

  return (
    <div className="space-y-4">
      <Card className="p-8 bg-white shadow-lg">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </Card>
      <p className="text-xs text-center text-muted-foreground">
        Aperçu du {template.type === "QUOTE" ? "devis" : template.type === "INVOICE" ? "facture" : "document"} - Thème: {template.theme}
      </p>
    </div>
  );
};
