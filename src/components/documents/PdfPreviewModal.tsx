import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { renderQuoteHTML } from "@/lib/quote-template-renderer";

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

  // Utiliser la fonction unifiée pour générer le HTML
  const html = renderQuoteHTML(template, documentData);

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
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div dangerouslySetInnerHTML={{ __html: html }} />
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
