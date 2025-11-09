import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Copy } from "lucide-react";

interface QuoteSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
}

export function QuoteSendModal({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  clientEmail,
  clientName,
}: QuoteSendModalProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(clientEmail);
  const [subject, setSubject] = useState(`Devis ${quoteNumber}`);
  const [message, setMessage] = useState(
    `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre devis.\n\nCordialement`
  );
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const handleSend = async () => {
    if (!recipientEmail) {
      toast({
        title: "Email requis",
        description: "Veuillez entrer une adresse email",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          quoteId,
          recipientEmail,
          recipientName: clientName,
          subject,
          message,
        },
      });

      if (error) throw error;

      setPublicUrl(data.publicUrl);

      toast({
        title: "Email envoyé",
        description: "Le devis a été envoyé avec succès (simulation)",
      });

    } catch (error: any) {
      console.error('Error sending quote:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le devis",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const copyPublicUrl = () => {
    if (publicUrl) {
      const fullUrl = `${window.location.origin}${publicUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Lien copié",
        description: "Le lien public a été copié dans le presse-papier",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Envoyer le devis par email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="email">Destinataire</Label>
            <Input
              id="email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div>
            <Label htmlFor="subject">Objet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message..."
              rows={6}
            />
          </div>

          {publicUrl && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Lien public</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyPublicUrl}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier
                </Button>
              </div>
              <p className="text-sm text-muted-foreground break-all">
                {window.location.origin}{publicUrl}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              📧 Mode simulation : L'email sera simulé dans les logs. 
              Le client pourra consulter et signer le devis via le lien public.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending || !recipientEmail}>
            <Mail className="h-4 w-4 mr-2" />
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}