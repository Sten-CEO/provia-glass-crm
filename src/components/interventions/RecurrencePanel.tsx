import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { eventBus, EVENTS } from "@/lib/eventBus";

interface RecurrencePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceJob: any;
}

export function RecurrencePanel({ open, onOpenChange, sourceJob }: RecurrencePanelProps) {
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [rrule, setRrule] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateRecurrence = async () => {
    if (!startDate || !endDate || !sourceJob) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      const occurrences = generateOccurrences();
      
      for (const occurrence of occurrences) {
        const { error } = await supabase.from("jobs").insert({
          titre: sourceJob.titre,
          client_id: sourceJob.client_id,
          client_nom: sourceJob.client_nom,
          employe_id: sourceJob.employe_id,
          employe_nom: sourceJob.employe_nom,
          assigned_employee_ids: sourceJob.assigned_employee_ids,
          date: format(occurrence, "yyyy-MM-dd"),
          heure_debut: startTime,
          heure_fin: endTime,
          statut: "À faire",
          type: sourceJob.type,
          zone: sourceJob.zone,
          adresse: sourceJob.adresse,
          description: sourceJob.description,
          notes: `${sourceJob.notes || ""}\n[Récurrence créée le ${format(new Date(), "dd/MM/yyyy")}]`.trim(),
          checklist: sourceJob.checklist,
          contract_id: sourceJob.contract_id,
        });

        if (error) throw error;
      }

      toast.success(`${occurrences.length} occurrence(s) créée(s)`);
      eventBus.emit(EVENTS.PLANNING_UPDATED);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création des occurrences");
    } finally {
      setLoading(false);
    }
  };

  const generateOccurrences = (): Date[] => {
    if (!startDate || !endDate) return [];

    const occurrences: Date[] = [];
    let currentDate = new Date(startDate);

    if (frequency === "custom" && rrule) {
      // TODO: Implémenter parsing RRULE
      toast.warning("RRULE personnalisé pas encore implémenté");
      return [];
    }

    while (currentDate <= endDate) {
      occurrences.push(new Date(currentDate));

      if (frequency === "daily") {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (frequency === "weekly") {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === "monthly") {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return occurrences;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Créer une récurrence</SheetTitle>
          <SheetDescription>
            Dupliquer cette intervention selon une fréquence définie
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Fréquence</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
                <SelectItem value="custom">Personnalisée (RRULE)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "custom" && (
            <div className="space-y-2">
              <Label>RRULE</Label>
              <Input
                placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
                value={rrule}
                onChange={(e) => setRrule(e.target.value)}
              />
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={fr} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={fr} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Heure début</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Heure fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Preview */}
          {startDate && endDate && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Aperçu</p>
              <p className="text-sm text-muted-foreground">
                {generateOccurrences().length} occurrence(s) seront créées
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleCreateRecurrence} disabled={loading} className="flex-1">
              {loading ? "Création..." : "Créer les occurrences"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
