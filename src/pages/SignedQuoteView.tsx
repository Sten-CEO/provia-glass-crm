import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, FileCheck } from "lucide-react";

export default function SignedQuoteView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>("");
  const [quoteNumber, setQuoteNumber] = useState<string>("");

  useEffect(() => {
    loadSignedQuote();
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [id]);

  const loadSignedQuote = async () => {
    try {
      setLoading(true);

      // Récupérer le devis avec sa signature
      const { data: quote, error: quoteError } = await supabase
        .from('devis')
        .select(`
          *,
          clients(*),
          companies(*),
          quote_signatures(*)
        `)
        .eq('id', id)
        .single();

      if (quoteError || !quote) {
        throw new Error('Devis introuvable');
      }

      setQuoteNumber(quote.numero);

      // Appeler la fonction pour générer le PDF signé
      const { data, error } = await supabase.functions.invoke('get-quote-public', {
        body: { token: quote.token },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // La structure de réponse contient { pdf: { filename, data } }
      const pdfData = data.pdf?.data || data.pdf;
      const pdfFilename = data.pdf?.filename || data.filename;

      setPdfFilename(pdfFilename);

      // Créer le Blob URL pour afficher le PDF
      let contentString: string;

      // Vérifier le type de pdfData
      if (typeof pdfData !== 'string') {
        console.error('PDF data is not a string:', typeof pdfData);
        throw new Error('Format de données PDF invalide');
      }

      try {
        // Essayer de décoder en base64
        contentString = atob(pdfData);
      } catch (error) {
        // Si le décodage échoue, c'est peut-être déjà une chaîne de caractères
        console.log('PDF data is not base64, using as-is');
        contentString = pdfData;
      }

      const isHTML = contentString.trim().startsWith('<!DOCTYPE') || contentString.trim().startsWith('<html');

      if (isHTML) {
        const blob = new Blob([contentString], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        const byteNumbers = new Array(contentString.length);
        for (let i = 0; i < contentString.length; i++) {
          byteNumbers[i] = contentString.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }

    } catch (error: any) {
      console.error('Error loading signed quote:', error);
      toast.error(error.message || 'Erreur lors du chargement du devis signé');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl || !pdfFilename) return;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success('Téléchargement du devis signé en cours');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du devis signé...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-xl p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/devis')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux devis
              </Button>
              <div className="flex items-center gap-2 text-green-600">
                <FileCheck className="h-5 w-5" />
                <h1 className="text-2xl font-bold">
                  Devis {quoteNumber} - Signé
                </h1>
              </div>
            </div>
            <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white shadow-xl rounded-b-lg p-6">
          {pdfUrl ? (
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                src={pdfUrl}
                className="w-full h-[800px] border-0"
                title="Devis signé"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Chargement du document...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
