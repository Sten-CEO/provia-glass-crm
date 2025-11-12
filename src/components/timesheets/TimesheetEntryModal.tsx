import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Play, Square } from "lucide-react";
import { format } from "date-fns";

interface TimesheetEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: any;
  onSaved: () => void;
}

export const TimesheetEntryModal = ({ open, onOpenChange, entry, onSaved }: TimesheetEntryModalProps) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    client_id: "",
    job_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_at: "09:00",
    end_at: "17:00",
    break_min: 60,
    travel_minutes: 0,
    hours: 0,
    is_billable: true,
    billing_status: "non_facturé",
    description: "",
    note: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (entry) {
      setFormData({
        employee_id: entry.employee_id || "",
        client_id: entry.client_id || "",
        job_id: entry.job_id || "",
        date: entry.date || format(new Date(), "yyyy-MM-dd"),
        start_at: entry.start_at || "09:00",
        end_at: entry.end_at || "17:00",
        break_min: entry.break_min || 0,
        travel_minutes: entry.travel_minutes || 0,
        hours: entry.hours || 0,
        is_billable: entry.is_billable ?? true,
        billing_status: entry.billing_status || "non_facturé",
        description: entry.description || "",
        note: entry.note || "",
      });
    }
  }, [entry]);

  const loadData = async () => {
    const [empRes, clientsRes, jobsRes] = await Promise.all([
      supabase.from("equipe").select("id, nom, hourly_rate"),
      supabase.from("clients").select("id, nom"),
      supabase.from("jobs").select("id, titre, client_id"),
    ]);

    if (empRes.data) setEmployees(empRes.data.filter((e) => e.id && e.id.trim() !== ""));
    if (clientsRes.data) setClients(clientsRes.data.filter((c) => c.id && c.id.trim() !== ""));
    if (jobsRes.data) setJobs(jobsRes.data.filter((j) => j.id && j.id.trim() !== ""));
  };

  const calculateHours = () => {
    if (!formData.start_at || !formData.end_at) return 0;
    const [startH, startM] = formData.start_at.split(":").map(Number);
    const [endH, endM] = formData.end_at.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const totalMinutes = Math.max(0, endMinutes - startMinutes - formData.break_min);
    return Math.round((totalMinutes / 60) * 100) / 100;
  };

  const handleStartStop = () => {
    if (!isRunning) {
      // Démarrer
      const now = new Date();
      setStartedAt(now);
      setIsRunning(true);
      setFormData({
        ...formData,
        start_at: format(now, "HH:mm"),
        date: format(now, "yyyy-MM-dd"),
      });
      toast.success("Pointage démarré");
    } else {
      // Arrêter
      const now = new Date();
      setIsRunning(false);
      setFormData({
        ...formData,
        end_at: format(now, "HH:mm"),
      });
      toast.success("Pointage arrêté");
    }
  };

  const handleSave = async () => {
    if (!formData.employee_id || !formData.date) {
      toast.error("Veuillez renseigner l'employé et la date");
      return;
    }

    const hours = formData.hours > 0 ? formData.hours : calculateHours();
    
    const payload = {
      employee_id: formData.employee_id,
      client_id: formData.client_id || null,
      job_id: formData.job_id || null,
      date: formData.date,
      start_at: formData.start_at || null,
      end_at: formData.end_at || null,
      break_min: formData.break_min || 0,
      travel_minutes: formData.travel_minutes || 0,
      hours,
      is_billable: formData.is_billable,
      billing_status: formData.billing_status,
      description: formData.description || null,
      note: formData.note || null,
      status: "draft" as const,
    };

    let error;
    if (entry) {
      const res = await supabase.from("timesheets_entries").update(payload).eq("id", entry.id);
      error = res.error;
    } else {
      const res = await supabase.from("timesheets_entries").insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    toast.success(entry ? "Entrée mise à jour" : "Entrée créée");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? "Modifier l'entrée" : "Nouvelle entrée de temps"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Start/Stop Timer */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">
                {isRunning ? "Pointage en cours..." : "Démarrer un pointage"}
              </span>
              {isRunning && startedAt && (
                <span className="text-sm text-muted-foreground">
                  Début: {format(startedAt, "HH:mm")}
                </span>
              )}
            </div>
            <Button
              variant={isRunning ? "destructive" : "default"}
              onClick={handleStartStop}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4" />
                  Arrêter
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Démarrer
                </>
              )}
            </Button>
          </div>

          {/* Employee */}
          <div>
            <Label>Employé *</Label>
            <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          {/* Job */}
          <div>
            <Label>Intervention</Label>
            <Select value={formData.job_id || "none"} onValueChange={(v) => setFormData({ ...formData, job_id: v === "none" ? "" : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Aucune (temps administratif)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {jobs.filter((j) => j.id && j.id.trim() !== "").map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div>
            <Label>Client</Label>
            <Select value={formData.client_id || "auto"} onValueChange={(v) => setFormData({ ...formData, client_id: v === "auto" ? "" : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Auto depuis intervention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                {clients.filter((c) => c.id && c.id.trim() !== "").map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Heure de début</Label>
              <Input
                type="time"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Heure de fin</Label>
              <Input
                type="time"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
              />
            </div>
          </div>

          {/* Breaks & Travel */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Pause (min)</Label>
              <Input
                type="number"
                min="0"
                value={formData.break_min}
                onChange={(e) => setFormData({ ...formData, break_min: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Trajet (min)</Label>
              <Input
                type="number"
                min="0"
                value={formData.travel_minutes}
                onChange={(e) => setFormData({ ...formData, travel_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Heures (auto)</Label>
              <Input type="number" step="0.01" value={calculateHours()} disabled />
            </div>
          </div>

          {/* Billing */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_billable"
                checked={formData.is_billable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_billable: !!checked })}
              />
              <Label htmlFor="is_billable" className="cursor-pointer">
                Temps facturable
              </Label>
            </div>

            {formData.is_billable && (
              <Select value={formData.billing_status} onValueChange={(v) => setFormData({ ...formData, billing_status: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_facturé">Non facturé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="facturé">Facturé</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>Description du travail</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Installation électrique, dépannage, etc."
              rows={2}
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes internes</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Notes privées..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            {entry ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
