import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { FileText, Briefcase } from "lucide-react";

interface QuoteConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteData: any;
}

export function QuoteConversionDialog({
  open,
  onOpenChange,
  quoteId,
  quoteData,
}: QuoteConversionDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);
  const [conversionType, setConversionType] = useState<"invoice" | "job">("invoice");

  const handleConvert = async () => {
    setConverting(true);

    try {
      if (conversionType === "invoice") {
        // Convertir en facture
        const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('factures')
          .insert({
            numero: invoiceNumber,
            client_id: quoteData.client_id,
            client_nom: quoteData.client_nom,
            montant: quoteData.montant,
            lignes: quoteData.lignes,
            total_ht: quoteData.total_ht,
            total_ttc: quoteData.total_ttc,
            statut: 'En attente',
            echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            converted_from_quote_id: quoteId,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Mettre à jour le devis
        await supabase
          .from('devis')
          .update({ converted_to_invoice_id: invoice.id })
          .eq('id', quoteId);

        toast({
          title: "Facture créée",
          description: `Facture ${invoiceNumber} créée avec succès`,
        });

        navigate(`/factures/${invoice.id}`);

      } else {
        // Convertir en chantier
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert({
            titre: `Chantier - ${quoteData.numero}`,
            client_id: quoteData.client_id,
            client_nom: quoteData.client_nom,
            employe_nom: 'Non assigné',
            date: new Date().toISOString().split('T')[0],
            statut: 'À faire',
            description: `Converti du devis ${quoteData.numero}`,
            converted_from_quote_id: quoteId,
            quote_id: quoteId,
          })
          .select()
          .single();

        if (jobError) throw jobError;

        // Sync consumables and materials from quote to intervention
        try {
          const { syncQuoteConsumablesToIntervention } = await import("@/lib/quoteToInterventionSync");
          const result = await syncQuoteConsumablesToIntervention(quoteId, job.id);
          console.log(`Synced ${result.consumablesCount} consommables/matériels and ${result.servicesCount} services`);
        } catch (syncError) {
          console.error("Error syncing quote items:", syncError);
        }

        // Mettre à jour le devis
        await supabase
          .from('devis')
          .update({ converted_to_job_id: job.id })
          .eq('id', quoteId);

        toast({
          title: "Chantier créé",
          description: "Le chantier a été créé avec succès",
        });

        navigate(`/jobs/${job.id}`);
      }

      onOpenChange(false);

    } catch (error: any) {
      console.error('Error converting quote:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de convertir le devis",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir le devis</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Label className="mb-3 block">Convertir en :</Label>
          <RadioGroup value={conversionType} onValueChange={(v) => setConversionType(v as any)}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="invoice" id="invoice" />
              <Label htmlFor="invoice" className="flex items-center gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Facture
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="job" id="job" />
              <Label htmlFor="job" className="flex items-center gap-2 cursor-pointer">
                <Briefcase className="h-4 w-4" />
                Chantier
              </Label>
            </div>
          </RadioGroup>

          <div className="mt-4 bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {conversionType === "invoice" 
                ? "Une nouvelle facture sera créée avec les mêmes lignes et montants que le devis."
                : "Un nouveau chantier sera créé et lié à ce devis."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConvert} disabled={converting}>
            {converting ? "Conversion..." : "Convertir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}