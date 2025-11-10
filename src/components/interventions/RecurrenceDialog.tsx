import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Repeat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addDays, addWeeks, addMonths } from "date-fns";

interface RecurrenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interventionId: string;
  interventionData: any;
}

export const RecurrenceDialog = ({
  open,
  onOpenChange,
  interventionId,
  interventionData
}: RecurrenceDialogProps) => {
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [interval, setInterval] = useState(1);
  const [occurrences, setOccurrences] = useState(10);
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!interventionData) return;

    setGenerating(true);
    try {
      const interventions = [];
      let currentDate = new Date(interventionData.date);

      // Generate interventions based on frequency
      for (let i = 0; i < occurrences; i++) {
        // Skip first one (original intervention)
        if (i > 0) {
          switch (frequency) {
            case "daily":
              currentDate = addDays(currentDate, interval);
              break;
            case "weekly":
              currentDate = addWeeks(currentDate, interval);
              break;
            case "monthly":
              currentDate = addMonths(currentDate, interval);
              break;
          }

          // Check if we've passed the end date
          if (endDate && currentDate > new Date(endDate)) {
            break;
          }

          // Generate intervention number
          const { data: numberData } = await supabase.rpc("generate_intervention_number");

          interventions.push({
            ...interventionData,
            id: undefined, // Let DB generate new ID
            intervention_number: numberData || `INT-${Date.now()}-${i}`,
            date: currentDate.toISOString().split("T")[0],
            titre: `${interventionData.titre} (${i}/${occurrences})`,
            internal_notes: `${interventionData.internal_notes || ""}\nRécurrence ${i}/${occurrences} - Créée automatiquement`,
            statut: "À planifier",
            created_at: undefined,
            updated_at: undefined,
          });
        }
      }

      if (interventions.length === 0) {
        toast.error("Aucune intervention à créer");
        return;
      }

      // Insert all interventions
      const { error } = await supabase
        .from("jobs")
        .insert(interventions);

      if (error) throw error;

      toast.success(`${interventions.length} interventions récurrentes créées`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating recurrent interventions:", error);
      toast.error("Erreur lors de la génération des interventions");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Créer une récurrence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Fréquence</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
                <SelectItem value="custom">Personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "custom" && (
            <div>
              <Label>Intervalle (jours)</Label>
              <Input
                type="number"
                min="1"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre d'occurrences</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={occurrences}
                onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Date de fin (optionnel)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm font-medium mb-2">Aperçu</p>
            <p className="text-sm text-muted-foreground">
              {occurrences} interventions seront créées avec une fréquence{" "}
              {frequency === "daily" ? "quotidienne" :
               frequency === "weekly" ? "hebdomadaire" :
               frequency === "monthly" ? "mensuelle" :
               `personnalisée (tous les ${interval} jours)`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Date de départ : {interventionData?.date}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {generating ? "Génération..." : "Générer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
