// Force reload - version 2024-12-08 13:43 - CACHE BUST
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";

// Log au niveau du module pour vérifier le rechargement
console.log('🔄 PublicQuoteView module loaded at:', new Date().toISOString());

interface QuoteData {
  id: string;
  numero: string;
  client_nom: string;
  client_email: string;
  total_ht: number;
  total_ttc: number;
  issued_at: string;
  expiry_date: string;
  statut: string;
  company: {
    name: string;
    email: string;
    telephone: string;
    adresse: string;
  };
  signature: {
    signer_name: string;
    signed_at: string;
  } | null;
}

const PublicQuoteView = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>("");
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signature form
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    loadQuote();
    // Cleanup PDF URL when component unmounts
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [token]);

  const loadQuote = async () => {
    try {
      console.log('[DEBUG 1] Starting loadQuote, token:', token);
      setLoading(true);
      setError(null);

      console.log('[DEBUG 2] Invoking get-quote-public function');
      const { data, error } = await supabase.functions.invoke('get-quote-public', {
        body: { token },
      });

      console.log('[DEBUG 3] Function response:', { hasData: !!data, hasError: !!error, data });

      if (error) {
        console.log('[DEBUG 4] Error received:', error);
        throw error;
      }

      console.log('[DEBUG 5] Checking if expired:', data.expired);
      if (data.expired) {
        setExpired(true);
        setQuote(data.quote);
        return;
      }

      console.log('[DEBUG 6] Setting quote and PDF data');
      console.log('[DEBUG 7] PDF data exists?', !!data.pdf, 'PDF data.data exists?', !!data.pdf?.data);
      setQuote(data.quote);
      setPdfData(data.pdf.data);
      setPdfFilename(data.pdf.filename);

      // Créer une URL blob pour le PDF/HTML
      console.log('Creating Blob from base64 data, length:', data.pdf.data.length);
      const byteCharacters = atob(data.pdf.data);

      // Détecter si c'est du HTML (commence par <!DOCTYPE ou <html)
      const isHTML = byteCharacters.trim().startsWith('<!DOCTYPE') || byteCharacters.trim().startsWith('<html');
      console.log('Content type detected:', isHTML ? 'HTML' : 'PDF');

      if (isHTML) {
        // C'est du HTML, créer un Blob HTML directement
        const blob = new Blob([byteCharacters], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        console.log('HTML Blob URL created:', url);
        setPdfUrl(url);
      } else {
        // C'est un vrai PDF, créer un Blob PDF
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        console.log('PDF Blob created, size:', blob.size, 'type:', blob.type);
        const url = URL.createObjectURL(blob);
        console.log('PDF Blob URL created:', url);
        setPdfUrl(url);
      }

      // Pré-remplir le nom et email du client
      if (data.quote.client_nom) {
        setSignerName(data.quote.client_nom);
      }
      if (data.quote.client_email) {
        setSignerEmail(data.quote.client_email);
      }

    } catch (error: any) {
      console.error('Error loading quote:', error);
      setError(error.message || 'Erreur lors du chargement du devis');
      toast.error(error.message || 'Erreur lors du chargement du devis');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfData || !pdfFilename) return;

    // Convertir base64 en blob
    const byteCharacters = atob(pdfData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    // Télécharger
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Téléchargement du devis en cours');
  };

  const handleSign = async () => {
    if (!signerName.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }

    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions');
      return;
    }

    setSigning(true);

    try {
      const { data, error } = await supabase.functions.invoke('sign-quote', {
        body: {
          token,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Devis signé avec succès !');

      // Recharger le devis
      await loadQuote();

    } catch (error: any) {
      console.error('Error signing quote:', error);
      toast.error(error.message || 'Erreur lors de la signature du devis');
    } finally {
      setSigning(false);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
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

  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Devis expiré</h1>
          <p className="text-slate-600 mb-2">
            Le devis <strong>{quote?.numero}</strong> a expiré.
          </p>
          {quote?.expiry_date && (
            <p className="text-sm text-slate-500 mb-6">
              Date d'expiration : {formatDate(quote.expiry_date)}
            </p>
          )}
          <p className="text-sm text-slate-600">
            Veuillez contacter {quote?.company?.name} pour obtenir un nouveau devis.
          </p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const isAlreadySigned = !!quote.signature;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-xl p-8 border-b">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Devis {quote.numero}
              </h1>
              <p className="text-slate-600">
                {quote.company.name}
              </p>
            </div>
            <div className="text-right">
              {isAlreadySigned ? (
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <CheckCircle className="h-5 w-5" />
                  Signé
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600 font-semibold">
                  <Clock className="h-5 w-5" />
                  En attente
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Client</p>
              <p className="font-semibold text-slate-800">{quote.client_nom}</p>
              {quote.client_email && (
                <p className="text-slate-600">{quote.client_email}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-500 mb-1">Montant TTC</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(quote.total_ttc)}
              </p>
            </div>
          </div>

          {quote.expiry_date && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Valable jusqu'au :</strong> {formatDate(quote.expiry_date)}
              </p>
            </div>
          )}
        </div>

        {/* PDF Viewer */}
        <div className="bg-white shadow-xl p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document de devis
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
                title="Document de devis"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Chargement du document...
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-b-lg shadow-xl p-8">
          {isAlreadySigned ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Devis signé électroniquement
                  </h3>
                  <p className="text-green-700 mb-1">
                    <strong>Signataire :</strong> {quote.signature.signer_name}
                  </p>
                  <p className="text-sm text-green-600">
                    <strong>Date de signature :</strong> {formatDate(quote.signature.signed_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Signature électronique
              </h2>
              <p className="text-slate-600 mb-6">
                Pour accepter ce devis, veuillez remplir les informations ci-dessous et signer électroniquement.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="signerName">Nom et prénom *</Label>
                  <Input
                    id="signerName"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="signerEmail">Email (optionnel)</Label>
                  <Input
                    id="signerEmail"
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="jean.dupont@example.com"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border">
                  <Checkbox
                    id="accept"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  />
                  <Label htmlFor="accept" className="text-sm leading-relaxed cursor-pointer">
                    Je confirme avoir lu et accepté les termes de ce devis.
                    En signant électroniquement, j'accepte que cette signature ait la même valeur juridique qu'une signature manuscrite.
                  </Label>
                </div>

                <Button
                  onClick={handleSign}
                  disabled={signing || !signerName.trim() || !acceptTerms}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
                  size="lg"
                >
                  {signing ? 'Signature en cours...' : 'Signer électroniquement'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Pour toute question, contactez{' '}
            <a href={`mailto:${quote.company.email}`} className="text-blue-600 hover:underline">
              {quote.company.email}
            </a>
            {quote.company.telephone && (
              <>
                {' '}ou appelez le{' '}
                <a href={`tel:${quote.company.telephone}`} className="text-blue-600 hover:underline">
                  {quote.company.telephone}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicQuoteView;
