import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Paperclip } from "lucide-react";
import { toast } from "sonner";

interface EmailComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
  totalTTC: number;
  onSend: (to: string[], subject: string, body: string) => Promise<void>;
}

export function EmailComposerModal({
  open,
  onOpenChange,
  quoteNumber,
  clientEmail,
  clientName,
  totalTTC,
  onSend,
}: EmailComposerModalProps) {
  const [to, setTo] = useState(clientEmail);
  const [subject, setSubject] = useState(
    `Devis ${quoteNumber} - ${clientName}`
  );
  const [body, setBody] = useState(
    `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre devis n°${quoteNumber} d'un montant de ${totalTTC.toFixed(2)}€ TTC.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Veuillez saisir au moins un destinataire");
      return;
    }

    setSending(true);
    try {
      const recipients = to.split(",").map((e) => e.trim()).filter((e) => e);
      await onSend(recipients, subject, body);
      toast.success("Email envoyé avec succès");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erreur lors de l'envoi", { description: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer le devis par email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>À (emails séparés par des virgules)</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@example.com, autre@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Objet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Pièce jointe : Devis_{quoteNumber}.pdf
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSend}
              disabled={sending}
              className="flex-1"
            >
              {sending ? "Envoi..." : "Envoyer"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Annuler
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Note Phase 3: L'envoi d'email est simulé. La fonction complète sera disponible en Phase 4.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
