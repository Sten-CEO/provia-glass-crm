import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface EmailDevisModalProps {
  open: boolean;
  onClose: () => void;
  devisNumero: string;
  clientEmail: string;
  clientNom: string;
}

export const EmailDevisModal = ({ open, onClose, devisNumero, clientEmail, clientNom }: EmailDevisModalProps) => {
  const [emailData, setEmailData] = useState({
    to: clientEmail,
    subject: `Devis ${devisNumero}`,
    body: `Bonjour ${clientNom},\n\nVeuillez trouver ci-joint le devis ${devisNumero}.\n\nCordialement,\nL'équipe`,
  });

  const handleSend = () => {
    // Stub: In production, this would call an edge function to send via Resend
    toast.success(`Email envoyé à ${emailData.to} (stub - pas de vrai email envoyé)`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-modal max-w-2xl">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wide">Envoyer le devis par email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Destinataire</Label>
            <Input
              value={emailData.to}
              onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
              className="glass-card"
            />
          </div>
          <div>
            <Label>Objet</Label>
            <Input
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="glass-card"
            />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={emailData.body}
              onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
              className="glass-card min-h-[200px]"
            />
          </div>
          <div className="glass-card p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Pièce jointe: <span className="font-semibold">Devis_{devisNumero}.pdf (stub)</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSend} className="flex-1 bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
