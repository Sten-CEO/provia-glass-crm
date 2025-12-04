import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Copy, Eye } from "lucide-react";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import { replaceVariables, TemplateVariableValues } from "@/lib/templateVariables";

interface QuoteSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
  quoteData?: {
    total_ht?: number;
    total_ttc?: number;
    issued_at?: string;
    expiry_date?: string;
  };
}

export function QuoteSendModal({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  clientEmail,
  clientName,
  quoteData,
}: QuoteSendModalProps) {
  const { toast } = useToast();
  const { templates, loadTemplates } = useDocumentTemplates({
    type: "EMAIL",
    emailType: "quote",
    autoLoad: true
  });

  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(clientEmail);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState(`Devis ${quoteNumber}`);
  const [message, setMessage] = useState(
    `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre devis.\n\nCordialement`
  );
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load templates on mount
  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        // Prepare variable values
        const variables: TemplateVariableValues = {
          NomClient: clientName,
          EmailClient: clientEmail,
          NumDevis: quoteNumber,
          NumDocument: quoteNumber,
          TypeDocument: "Devis",
          MontantHT: quoteData?.total_ht || 0,
          MontantTTC: quoteData?.total_ttc || 0,
          DateEnvoi: new Date().toISOString(),
          DateCreation: quoteData?.issued_at || new Date().toISOString(),
          DateExpiration: quoteData?.expiry_date,
        };

        // Replace variables in template
        const newSubject = replaceVariables(template.email_subject || "", variables);
        const newBody = replaceVariables(template.email_body || "", variables);

        setSubject(newSubject);
        setMessage(newBody);
      }
    }
  }, [selectedTemplateId, templates, clientName, clientEmail, quoteNumber, quoteData]);

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

      if (data.simulation) {
        toast({
          title: "⚠️ Envoi simulé",
          description: data.message,
        });
      } else {
        toast({
          title: "Email envoyé",
          description: "Le devis a été envoyé avec succès",
        });
      }

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

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 font-medium mb-1">
              ⚠️ Mode simulation
            </p>
            <p className="text-sm text-amber-700">
              Configurez la clé API Resend pour l'envoi réel d'emails. 
              En attendant, le client peut consulter et signer le devis via le lien public.
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