import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, FileCheck } from "lucide-react";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

export default function SignedQuoteView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId, loading: companyLoading } = useCurrentCompany();
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>("");
  const [quoteNumber, setQuoteNumber] = useState<string>("");
  const [isHtmlContent, setIsHtmlContent] = useState(false);

  useEffect(() => {
    if (!companyLoading && companyId) {
      loadSignedQuote();
    }
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [id, companyId, companyLoading]);

  const loadSignedQuote = async () => {
    try {
      setLoading(true);

      if (!companyId) {
        throw new Error('Société non identifiée');
      }

      // Récupérer le devis avec sa signature - SECURITY: filter by company_id
      // Note: pas de jointure companies(*) car pas de FK entre devis et companies
      const { data: quote, error: quoteError } = await supabase
        .from('devis')
        .select(`
          *,
          clients(*),
          quote_signatures(*)
        `)
        .eq('id', id)
        .eq('company_id', companyId)  // Security: only access own company's quotes
        .single();

      if (quoteError || !quote) {
        console.error('Quote error:', quoteError);
        toast.error('Devis introuvable ou accès non autorisé');
        navigate('/devis');
        return;
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
      // Vérifier le type de pdfData
      if (typeof pdfData !== 'string') {
        console.error('PDF data is not a string:', typeof pdfData);
        throw new Error('Format de données PDF invalide');
      }

      // Décoder le base64 en Uint8Array (pour gérer correctement l'UTF-8)
      let bytes: Uint8Array;
      let decodedContent: string;

      try {
        // Essayer de décoder en base64
        const binaryString = atob(pdfData);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Décoder l'UTF-8 correctement
        const decoder = new TextDecoder('utf-8');
        decodedContent = decoder.decode(bytes);
      } catch (error) {
        // Si le décodage échoue, c'est peut-être déjà une chaîne de caractères
        decodedContent = pdfData;
        bytes = new TextEncoder().encode(pdfData);
      }

      const isHTML = decodedContent.trim().startsWith('<!DOCTYPE') || decodedContent.trim().startsWith('<html');
      setIsHtmlContent(isHTML);

      if (isHTML) {
        // C'est du HTML, créer un Blob HTML avec le contenu UTF-8 décodé
        const blob = new Blob([decodedContent], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        // C'est un vrai PDF, créer un Blob PDF avec les bytes bruts
        const blob = new Blob([bytes], { type: 'application/pdf' });
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

    // Ajuster le nom de fichier si c'est du HTML
    let downloadFilename = pdfFilename;
    if (isHtmlContent) {
      downloadFilename = pdfFilename.replace(/\.pdf$/i, '.html');
    }

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success('Téléchargement du devis signé en cours');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du devis signé...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 py-8 px-4">
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
            <Button onClick={handleDownload} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900">
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
