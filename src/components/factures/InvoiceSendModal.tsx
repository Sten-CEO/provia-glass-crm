import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import { replaceVariables, TemplateVariableValues } from "@/lib/templateVariables";

interface InvoiceSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  clientEmail: string;
  clientName: string;
  invoiceData?: {
    total_ht?: number;
    total_ttc?: number;
    issue_date?: string;
    echeance?: string;
  };
}

export function InvoiceSendModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  clientEmail,
  clientName,
  invoiceData,
}: InvoiceSendModalProps) {
  const { templates, loadTemplates } = useDocumentTemplates({
    type: "EMAIL",
    emailType: "invoice",
    autoLoad: true
  });

  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(clientEmail);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState(`Facture ${invoiceNumber}`);
  const [message, setMessage] = useState(
    `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre facture.\n\nMerci de procéder au règlement dans les meilleurs délais.\n\nCordialement`
  );

  // Load templates on mount
  useEffect(() => {
    if (open) {
      loadTemplates();
      setRecipientEmail(clientEmail);
    }
  }, [open, clientEmail]);

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        // Prepare variable values
        const variables: TemplateVariableValues = {
          NomClient: clientName,
          EmailClient: clientEmail,
          NumFacture: invoiceNumber,
          NumDocument: invoiceNumber,
          TypeDocument: "Facture",
          MontantHT: invoiceData?.total_ht || 0,
          MontantTTC: invoiceData?.total_ttc || 0,
          DateEnvoi: new Date().toISOString(),
          DateCreation: invoiceData?.issue_date || new Date().toISOString(),
          DateEcheance: invoiceData?.echeance,
        };

        // Replace variables in template
        const newSubject = replaceVariables(template.email_subject || "", variables);
        const newBody = replaceVariables(template.email_body || "", variables);

        setSubject(newSubject);
        setMessage(newBody);
      }
    }
  }, [selectedTemplateId, templates, clientName, clientEmail, invoiceNumber, invoiceData]);

  const handleSend = async () => {
    if (!recipientEmail) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId,
          recipientEmail,
          recipientName: clientName,
          subject,
          message,
        },
      });

      if (error) throw error;

      if (data?.simulation) {
        toast.warning("⚠️ Envoi simulé", {
          description: data.message,
        });
      } else {
        toast.success("Email envoyé", {
          description: `La facture a été envoyée à ${recipientEmail}`,
        });
        onOpenChange(false);
      }

    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast.error("Erreur lors de l'envoi", {
        description: error.message || "Impossible d'envoyer la facture. Veuillez réessayer plus tard.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Envoyer la facture par email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {templates.length > 0 && (
            <div>
              <Label htmlFor="template">Modèle d'email (optionnel)</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un modèle..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Les variables seront automatiquement remplacées
              </p>
            </div>
          )}

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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium mb-1">
              📎 Pièce jointe
            </p>
            <p className="text-sm text-blue-700">
              La facture sera automatiquement jointe au format PDF: <strong>Facture_{invoiceNumber}.pdf</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
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
