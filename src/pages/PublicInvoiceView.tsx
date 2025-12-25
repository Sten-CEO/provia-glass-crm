import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface InvoiceData {
  id: string;
  numero: string;
  client_nom: string;
  client_email: string;
  total_ht: number;
  total_ttc: number;
  issue_date: string;
  echeance: string;
  statut: string;
  company: {
    name: string;
    email: string;
    telephone: string;
    adresse: string;
  };
}

const PublicInvoiceView = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
    // Cleanup PDF URL when component unmounts
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [token]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('get-invoice-public', {
        body: { token },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setInvoice(data.invoice);
      setPdfData(data.pdf.data);
      setPdfFilename(data.pdf.filename);

      // Décoder le base64 en Uint8Array
      const base64 = data.pdf.data;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Décoder l'UTF-8 correctement
      const decoder = new TextDecoder('utf-8');
      const decodedContent = decoder.decode(bytes);

      // Détecter si c'est du HTML
      const isHTML = decodedContent.trim().startsWith('<!DOCTYPE') || decodedContent.trim().startsWith('<html');

      if (isHTML) {
        const blob = new Blob([decodedContent], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }

    } catch (error: any) {
      console.error('Error loading invoice:', error);
      setError(error.message || 'Erreur lors du chargement de la facture');
      toast.error(error.message || 'Erreur lors du chargement de la facture');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfData || !pdfFilename) return;

    const base64 = pdfData;
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const decoder = new TextDecoder('utf-8');
    const decodedContent = decoder.decode(bytes);
    const isHTML = decodedContent.trim().startsWith('<!DOCTYPE') || decodedContent.trim().startsWith('<html');

    const blob = isHTML
      ? new Blob([decodedContent], { type: 'text/html; charset=utf-8' })
      : new Blob([bytes], { type: 'application/pdf' });

    const downloadFilename = isHTML
      ? pdfFilename.replace(/\.pdf$/, '.html')
      : pdfFilename;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Téléchargement de la facture en cours');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Erreur</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-xl p-8 border-b">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Facture {invoice.numero}
              </h1>
              <p className="text-slate-600">
                {invoice.company.name}
              </p>
            </div>
            <div className="text-right">
              {invoice.statut === 'Payée' ? (
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <CheckCircle className="h-5 w-5" />
                  Payée
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600 font-semibold">
                  <Clock className="h-5 w-5" />
                  En attente de paiement
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Client</p>
              <p className="font-semibold text-slate-800">{invoice.client_nom}</p>
              {invoice.client_email && (
                <p className="text-slate-600">{invoice.client_email}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-500 mb-1">Montant TTC</p>
              <p className="text-2xl font-bold text-yellow-500">
                {formatCurrency(invoice.total_ttc)}
              </p>
            </div>
          </div>

          {invoice.echeance && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Date d'échéance :</strong> {formatDate(invoice.echeance)}
              </p>
            </div>
          )}
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-b-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document de facture
            </h2>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>

          {pdfUrl ? (
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                src={pdfUrl}
                className="w-full h-[600px] border-0"
                title="Document de facture"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Chargement du document...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Pour toute question, contactez{' '}
            <a href={`mailto:${invoice.company.email}`} className="text-yellow-600 hover:underline">
              {invoice.company.email}
            </a>
            {invoice.company.telephone && (
              <>
                {' '}ou appelez le{' '}
                <a href={`tel:${invoice.company.telephone}`} className="text-yellow-600 hover:underline">
                  {invoice.company.telephone}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
