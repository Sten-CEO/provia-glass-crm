import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Check, X } from "lucide-react";

interface Quote {
  id: string;
  numero: string;
  client_nom: string;
  montant: string;
  total_ht: number;
  total_ttc: number;
  lignes: any;
  statut: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  message_client?: string;
  conditions?: string;
}

export default function PublicQuoteView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [token]);

  const loadQuote = async () => {
    if (!token) return;

    try {
      // Charger le devis par token
      const { data, error } = await supabase
        .from('devis')
        .select('*')
        .eq('token', token)
        .single();

      if (error) throw error;

      setQuote(data);

      // Enregistrer l'événement "opened"
      await supabase.from('quote_events').insert({
        quote_id: data.id,
        event_type: 'opened',
        ip_address: 'client',
        user_agent: navigator.userAgent
      });

    } catch (error: any) {
      console.error('Error loading quote:', error);
      toast({
        title: "Erreur",
        description: "Devis introuvable ou expiré",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quote || !signerName || !signerEmail || !acceptedTerms) {
      toast({
        title: "Information manquante",
        description: "Veuillez remplir tous les champs et accepter les conditions",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Créer la signature
      await supabase.from('quote_signatures').insert({
        quote_id: quote.id,
        signer_name: signerName,
        signer_email: signerEmail,
        signature_image_url: 'digital-signature',
        pdf_hash: 'simulation',
        ip_address: 'client',
        user_agent: navigator.userAgent,
        accepted_terms: true
      });

      // Mettre à jour le devis
      await supabase
        .from('devis')
        .update({
          statut: 'Accepté',
          accepted_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      // Enregistrer l'événement
      await supabase.from('quote_events').insert({
        quote_id: quote.id,
        event_type: 'accepted',
        metadata: { signer_name: signerName, signer_email: signerEmail }
      });

      toast({
        title: "Devis accepté",
        description: "Merci ! Nous vous contacterons prochainement.",
      });

      // Recharger le devis pour afficher le nouveau statut
      await loadQuote();

    } catch (error: any) {
      console.error('Error accepting quote:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accepter le devis",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!quote) return;

    setProcessing(true);

    try {
      await supabase
        .from('devis')
        .update({
          statut: 'Refusé',
          declined_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      await supabase.from('quote_events').insert({
        quote_id: quote.id,
        event_type: 'declined'
      });

      toast({
        title: "Devis refusé",
        description: "Nous avons bien pris en compte votre refus.",
      });

      await loadQuote();

    } catch (error: any) {
      console.error('Error declining quote:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser le devis",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Devis introuvable</h1>
          <p className="text-muted-foreground">Ce devis n'existe pas ou a expiré.</p>
        </Card>
      </div>
    );
  }

  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date();
  const isAccepted = quote.accepted_at !== null;
  const isDeclined = quote.declined_at !== null;
  const canInteract = !isExpired && !isAccepted && !isDeclined;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <Card className="p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Devis {quote.numero}</h1>
              <p className="text-muted-foreground">Client: {quote.client_nom}</p>
            </div>
            <FileText className="h-12 w-12 text-primary" />
          </div>

          {isAccepted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                <span className="font-medium">Devis accepté</span>
              </div>
            </div>
          )}

          {isDeclined && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <X className="h-5 w-5" />
                <span className="font-medium">Devis refusé</span>
              </div>
            </div>
          )}

          {isExpired && !isAccepted && !isDeclined && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-orange-700">Ce devis a expiré</p>
            </div>
          )}

          {quote.message_client && (
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="text-sm">{quote.message_client}</p>
            </div>
          )}
        </Card>

        {/* Lignes du devis */}
        <Card className="p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Détails</h2>
          
          <div className="space-y-2">
            {(Array.isArray(quote.lignes) ? quote.lignes : []).map((ligne: any, index: number) => (
              <div key={index} className="flex justify-between py-2 border-b">
                <div>
                  <p className="font-medium">{ligne.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Qté: {ligne.quantite || ligne.qty} × {(ligne.prix_unitaire || ligne.unit_price_ht)?.toFixed(2)} €
                  </p>
                </div>
                <p className="font-medium">
                  {((ligne.quantite || ligne.qty) * (ligne.prix_unitaire || ligne.unit_price_ht)).toFixed(2)} €
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex justify-between">
              <span>Total HT</span>
              <span className="font-medium">{quote.total_ht?.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span>{quote.total_ttc?.toFixed(2)} €</span>
            </div>
          </div>
        </Card>

        {/* Formulaire de signature */}
        {canInteract && (
          <Card className="p-8">
            <h2 className="text-xl font-semibold mb-4">Accepter le devis</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="signerName">Nom complet *</Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <Label htmlFor="signerEmail">Email *</Label>
                <Input
                  id="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                  J'accepte les conditions générales de vente et confirme mon accord pour ce devis
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAccept}
                disabled={processing || !signerName || !signerEmail || !acceptedTerms}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Accepter le devis
              </Button>
              
              <Button
                onClick={handleDecline}
                disabled={processing}
                variant="outline"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Refuser
              </Button>
            </div>

            {quote.conditions && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Conditions</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {quote.conditions}
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}