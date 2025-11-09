import { Card } from "@/components/ui/card";

interface TemplatePreviewProps {
  template: {
    type: string;
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
      .replace(/{company_name}/g, "Provia BASE")
      .replace(/{client_name}/g, "Jean Dupont")
      .replace(/{document_number}/g, "DEV-2025-0001")
      .replace(/{total_ht}/g, "1 000,00 €")
      .replace(/{total_ttc}/g, "1 200,00 €")
      .replace(/{date}/g, new Date().toLocaleDateString("fr-FR"))
      .replace(/{due_date}/g, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"))
      .replace(/{document_type}/g, template.type === "QUOTE" ? "Devis" : "Facture");
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

  const logoSizeClass = template.logo_size === "small" ? "h-12" : template.logo_size === "large" ? "h-24" : "h-16";
  const logoAlignClass = template.logo_position === "center" ? "justify-center" : template.logo_position === "right" ? "justify-end" : "justify-start";

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: template.css || "" }} />
      <Card className="p-8 bg-white shadow-lg">
        <div 
          className="space-y-6"
          style={{ 
            fontFamily: template.font_family || "Arial",
            color: "#1a1a1a"
          }}
        >
          {/* En-tête avec logo */}
          {template.header_logo && (
            <div className={`flex ${logoAlignClass} pb-4 border-b-2`} style={{ borderColor: template.main_color || "#3b82f6" }}>
              <img 
                src={template.header_logo} 
                alt="Logo"
                className={`${logoSizeClass} object-contain`}
              />
            </div>
          )}

          {/* En-tête HTML personnalisé */}
          {template.header_html && (
            <div 
              className="header"
              dangerouslySetInnerHTML={{ __html: replaceVariables(template.header_html) }}
            />
          )}

          {/* Informations du document */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold" style={{ color: template.main_color || "#3b82f6" }}>
                {template.type === "QUOTE" ? "Devis" : "Facture"}
              </p>
              <p>N° DEV-2025-0001</p>
              <p>Date: {new Date().toLocaleDateString("fr-FR")}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Client</p>
              <p>Jean Dupont</p>
              <p>123 Rue Exemple</p>
              <p>75001 Paris</p>
            </div>
          </div>

          {/* Corps du document */}
          {template.content_html ? (
            <div 
              className="content"
              dangerouslySetInnerHTML={{ __html: replaceVariables(template.content_html) }}
            />
          ) : (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: template.main_color || "#3b82f6", color: template.main_color || "#3b82f6" }}>
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Qté</th>
                    <th className="text-right py-2">P.U. HT</th>
                    <th className="text-right py-2">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Prestation exemple</td>
                    <td className="text-right">1</td>
                    <td className="text-right">1 000,00 €</td>
                    <td className="text-right">1 000,00 €</td>
                  </tr>
                </tbody>
              </table>

              <div className="space-y-1 text-sm text-right">
                <div className="flex justify-end gap-4">
                  <span>Total HT:</span>
                  <span className="font-semibold">1 000,00 €</span>
                </div>
                {template.show_discounts && (
                  <div className="flex justify-end gap-4 text-green-600">
                    <span>Remise (10%):</span>
                    <span>-100,00 €</span>
                  </div>
                )}
                {template.show_vat && (
                  <div className="flex justify-end gap-4">
                    <span>TVA (20%):</span>
                    <span>200,00 €</span>
                  </div>
                )}
                <div className="flex justify-end gap-4 text-lg font-bold pt-2 border-t-2" style={{ borderColor: template.main_color || "#3b82f6", color: template.main_color || "#3b82f6" }}>
                  <span>Total TTC:</span>
                  <span>1 200,00 €</span>
                </div>
                {template.show_remaining_balance && template.type === "INVOICE" && (
                  <div className="flex justify-end gap-4 text-orange-600 font-semibold">
                    <span>Restant dû:</span>
                    <span>600,00 €</span>
                  </div>
                )}
              </div>
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
          {template.signature_enabled && template.type === "QUOTE" && (
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
      </Card>
      <p className="text-xs text-center text-muted-foreground">
        Aperçu du {template.type === "QUOTE" ? "devis" : "facture"} - Thème: {template.theme}
      </p>
    </div>
  );
};
