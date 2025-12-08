/**
 * LivePdfPreview - Aperçu en temps réel dans l'éditeur de templates
 *
 * Ce composant utilise le renderer unifié (quoteHtmlRenderer.ts) pour
 * garantir que l'aperçu est identique au PDF final.
 */

import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { DocumentTemplate } from "@/hooks/useDocumentTemplates";
import {
  renderQuoteToHtml,
  getSampleQuoteData,
  QuoteRenderData,
} from "@/lib/quoteHtmlRenderer";
import { useMemo } from "react";

interface LivePdfPreviewProps {
  template: Partial<DocumentTemplate>;
  documentType?: "quote" | "invoice";
}

export function LivePdfPreview({
  template,
  documentType = "quote",
}: LivePdfPreviewProps) {
  // Get sample data for preview
  const sampleData: QuoteRenderData = useMemo(() => {
    const data = getSampleQuoteData();

    // Adjust for invoice type
    if (documentType === "invoice") {
      return {
        ...data,
        numero: "FACT-2025-001",
      };
    }

    return data;
  }, [documentType]);

  // Generate HTML using the unified renderer
  const previewHtml = useMemo(() => {
    return renderQuoteToHtml(sampleData, template, {
      documentType: documentType === "quote" ? "QUOTE" : "INVOICE",
      mode: "preview",
    });
  }, [sampleData, template, documentType]);

  return (
    <Card className="overflow-hidden bg-gray-100 p-4">
      <div
        className="bg-white shadow-lg rounded-lg overflow-hidden"
        style={{ maxHeight: "800px", overflow: "auto" }}
      >
        {/* Render the unified HTML */}
        <div
          className="quote-preview-content"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
          style={{
            // Override body styles since we're embedding in a div
            padding: "40px",
            fontFamily: template.font_family || "Arial, sans-serif",
          }}
        />
      </div>

      {/* Preview indicator */}
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-3 h-3" />
        <span>Aperçu du document avec données d'exemple</span>
      </div>
    </Card>
  );
}
