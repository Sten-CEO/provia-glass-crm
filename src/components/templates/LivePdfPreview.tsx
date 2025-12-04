import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { replaceVariables, getSampleValues } from "@/lib/templateVariables";
import { DocumentTemplate } from "@/hooks/useDocumentTemplates";

interface LivePdfPreviewProps {
  template: Partial<DocumentTemplate>;
  documentType?: "quote" | "invoice";
}

export function LivePdfPreview({
  template,
  documentType = "quote",
}: LivePdfPreviewProps) {
  // Get sample values for preview
  const sampleValues = getSampleValues(documentType);

  // Replace variables in HTML content
  const headerHtml = replaceVariables(
    template.header_html || "",
    sampleValues
  );
  const contentHtml = replaceVariables(
    template.content_html || "",
    sampleValues
  );
  const footerHtml = replaceVariables(
    template.footer_html || "",
    sampleValues
  );

  // Get background style
  const getBackgroundStyle = () => {
    const mainColor = template.main_color || "#3b82f6";
    const accentColor = template.accent_color || "#fbbf24";

    switch (template.background_style) {
      case "gradient":
        return {
          background: `linear-gradient(135deg, ${mainColor}10 0%, ${accentColor}10 100%)`,
        };
      case "pattern":
        return {
          backgroundColor: "#f9fafb",
          backgroundImage: `repeating-linear-gradient(45deg, ${mainColor}05 0px, ${mainColor}05 10px, transparent 10px, transparent 20px)`,
        };
      case "none":
        return { background: "transparent" };
      default:
        return { background: "white" };
    }
  };

  // Get header layout style
  const getHeaderLayoutClass = () => {
    switch (template.header_layout) {
      case "logo-center":
        return "flex flex-col items-center text-center";
      case "logo-right":
        return "flex flex-row-reverse items-center justify-between";
      case "split":
        return "grid grid-cols-2 gap-4";
      default:
        return "flex items-center justify-between";
    }
  };

  const mainColor = template.main_color || "#3b82f6";
  const accentColor = template.accent_color || "#fbbf24";
  const fontFamily = template.font_family || "Arial";

  return (
    <Card className="overflow-hidden bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ maxHeight: "800px" }}>
        {/* Document preview */}
        <div
          className="p-8"
          style={{
            ...getBackgroundStyle(),
            fontFamily,
          }}
        >
          {/* Header with logo */}
          {template.header_logo && (
            <div className={`mb-6 ${getHeaderLayoutClass()}`}>
              <div className="flex items-center gap-4">
                {template.header_logo && (
                  <img
                    src={template.header_logo}
                    alt="Logo"
                    className={`object-contain ${
                      template.logo_size === "small"
                        ? "h-12"
                        : template.logo_size === "large"
                        ? "h-24"
                        : "h-16"
                    }`}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: mainColor }}>
                  {documentType === "quote" ? "DEVIS" : "FACTURE"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  N° {sampleValues.NumDocument}
                </p>
              </div>
            </div>
          )}

          {/* Custom header HTML */}
          {headerHtml && (
            <div
              className="mb-6"
              dangerouslySetInnerHTML={{ __html: headerHtml }}
            />
          )}

          {/* Company and client info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: mainColor }}
              >
                Émetteur
              </h3>
              <div className="text-sm space-y-1">
                <div className="font-medium">{sampleValues.NomEntreprise}</div>
                <div className="text-muted-foreground">
                  {sampleValues.AdresseEntreprise}
                </div>
                <div className="text-muted-foreground">
                  {sampleValues.TelephoneEntreprise}
                </div>
                <div className="text-muted-foreground">
                  {sampleValues.EmailEntreprise}
                </div>
              </div>
            </div>
            <div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: accentColor }}
              >
                Client
              </h3>
              <div className="text-sm space-y-1">
                <div className="font-medium">{sampleValues.NomClient}</div>
                <div className="text-muted-foreground">
                  {sampleValues.AdresseClient}
                </div>
                <div className="text-muted-foreground">
                  {sampleValues.TelephoneClient}
                </div>
                <div className="text-muted-foreground">
                  {sampleValues.EmailClient}
                </div>
              </div>
            </div>
          </div>

          {/* Custom content HTML */}
          {contentHtml && (
            <div
              className="mb-6"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          )}

          {/* Sample table */}
          <div className="mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: `${mainColor}20` }}>
                  {(template.table_columns?.description ?? true) && (
                    <th className="border p-2 text-left">Description</th>
                  )}
                  {(template.table_columns?.quantity ?? true) && (
                    <th className="border p-2 text-center">Qté</th>
                  )}
                  {(template.table_columns?.unit_price_ht ?? true) && (
                    <th className="border p-2 text-right">PU HT</th>
                  )}
                  {(template.table_columns?.vat_rate ?? true) && (
                    <th className="border p-2 text-center">TVA</th>
                  )}
                  {(template.table_columns?.total_ht ?? true) && (
                    <th className="border p-2 text-right">Total HT</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {(template.table_columns?.description ?? true) && (
                    <td className="border p-2">Prestation d'exemple</td>
                  )}
                  {(template.table_columns?.quantity ?? true) && (
                    <td className="border p-2 text-center">1</td>
                  )}
                  {(template.table_columns?.unit_price_ht ?? true) && (
                    <td className="border p-2 text-right">1 500,00 €</td>
                  )}
                  {(template.table_columns?.vat_rate ?? true) && (
                    <td className="border p-2 text-center">
                      {template.default_vat_rate || 20}%
                    </td>
                  )}
                  {(template.table_columns?.total_ht ?? true) && (
                    <td className="border p-2 text-right">1 500,00 €</td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2 text-sm">
              {template.show_vat && (
                <>
                  <div className="flex justify-between">
                    <span>Total HT :</span>
                    <span className="font-medium">{sampleValues.MontantHT}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA ({template.default_vat_rate || 20}%) :</span>
                    <span className="font-medium">{sampleValues.MontantTVA}</span>
                  </div>
                </>
              )}
              <div
                className="flex justify-between text-lg font-bold pt-2 border-t-2"
                style={{ borderColor: mainColor }}
              >
                <span>Total TTC :</span>
                <span style={{ color: mainColor }}>{sampleValues.MontantTTC}</span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          {template.default_payment_method && (
            <div className="mb-6 p-4 rounded" style={{ backgroundColor: `${accentColor}10` }}>
              <div className="text-sm">
                <span className="font-semibold">Méthode de paiement : </span>
                <span>{template.default_payment_method}</span>
              </div>
            </div>
          )}

          {/* Signature zone for quotes */}
          {template.signature_enabled && documentType === "quote" && (
            <div className="mb-6 p-4 border-2 border-dashed rounded">
              <p className="text-sm font-semibold mb-2">Bon pour accord</p>
              <p className="text-xs text-muted-foreground">
                Date et signature du client
              </p>
            </div>
          )}

          {/* Custom footer HTML */}
          {footerHtml && (
            <div
              className="text-xs text-center text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
          )}
        </div>

        {/* Custom CSS preview */}
        {template.css && (
          <style dangerouslySetInnerHTML={{ __html: template.css }} />
        )}
      </div>

      {/* Preview indicator */}
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-3 h-3" />
        <span>Aperçu du document avec données d'exemple</span>
      </div>
    </Card>
  );
}
