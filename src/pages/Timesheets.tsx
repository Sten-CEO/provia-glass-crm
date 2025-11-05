import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Timesheet {
  id: string;
  employe_id: string | null;
  employe_nom: string;
  job_id: string | null;
  job_titre: string;
  debut: string;
  fin: string;
  total: string;
}

const Timesheets = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [newTimesheet, setNewTimesheet] = useState({
    employe_id: "",
    job_id: "",
    debut: "09:00",
    fin: "17:00",
  });

  const calculateTotal = (debut: string, fin: string) => {
    const [dh, dm] = debut.split(":").map(Number);
    const [fh, fm] = fin.split(":").map(Number);
    const totalMinutes = (fh * 60 + fm) - (dh * 60 + dm);
    const hours = Math.floor(totalMinutes / 60);
    return `${hours}h`;
  };

  const loadTimesheets = async () => {
    const { data, error } = await supabase
      .from("timesheets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setTimesheets(data || []);
  };

  const loadData = async () => {
    const { data: employesData } = await supabase.from("equipe").select("id, nom");
    const { data: jobsData } = await supabase.from("jobs").select("id, titre");
    setEmployes(employesData || []);
    setJobs(jobsData || []);
  };

  useEffect(() => {
    loadTimesheets();
    loadData();

    const channel = supabase
      .channel("timesheets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "timesheets" }, () => {
        loadTimesheets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddTimesheet = async () => {
    if (!newTimesheet.employe_id || !newTimesheet.job_id) {
      toast.error("Employé et job requis");
      return;
    }

    const employe = employes.find((e) => e.id === newTimesheet.employe_id);
    const job = jobs.find((j) => j.id === newTimesheet.job_id);
    const total = calculateTotal(newTimesheet.debut, newTimesheet.fin);

    const { error } = await supabase.from("timesheets").insert([
      {
        employe_id: newTimesheet.employe_id,
        employe_nom: employe?.nom || "",
        job_id: newTimesheet.job_id,
        job_titre: job?.titre || "",
        debut: newTimesheet.debut,
        fin: newTimesheet.fin,
        total,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Pointage créé avec succès");
    setNewTimesheet({
      employe_id: "",
      job_id: "",
      debut: "09:00",
      fin: "17:00",
    });
    setOpen(false);
  };

  const handleEditTimesheet = async () => {
    if (!selectedTimesheet) return;

    const total = calculateTotal(selectedTimesheet.debut, selectedTimesheet.fin);

    const { error } = await supabase
      .from("timesheets")
      .update({
        debut: selectedTimesheet.debut,
        fin: selectedTimesheet.fin,
        total,
      })
      .eq("id", selectedTimesheet.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Pointage modifié avec succès");
    setEditOpen(false);
    setSelectedTimesheet(null);
  };

  const handleDeleteTimesheet = async () => {
    if (!selectedTimesheet) return;

    const { error } = await supabase.from("timesheets").delete().eq("id", selectedTimesheet.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Pointage supprimé avec succès");
    setDeleteOpen(false);
    setSelectedTimesheet(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Timesheets</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Pointer
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouveau Pointage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Employé *</Label>
                <Select value={newTimesheet.employe_id} onValueChange={(v) => setNewTimesheet({ ...newTimesheet, employe_id: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Sélectionner un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {employes.map((employe) => (
                      <SelectItem key={employe.id} value={employe.id}>
                        {employe.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Job *</Label>
                <Select value={newTimesheet.job_id} onValueChange={(v) => setNewTimesheet({ ...newTimesheet, job_id: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Sélectionner un job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Début *</Label>
                <Input
                  type="time"
                  value={newTimesheet.debut}
                  onChange={(e) => setNewTimesheet({ ...newTimesheet, debut: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Fin *</Label>
                <Input
                  type="time"
                  value={newTimesheet.fin}
                  onChange={(e) => setNewTimesheet({ ...newTimesheet, fin: e.target.value })}
                  className="glass-card"
                />
              </div>
              <Button onClick={handleAddTimesheet} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Employé</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Job</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Début</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Fin</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Total</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((timesheet) => (
                <tr key={timesheet.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{timesheet.employe_nom}</td>
                  <td className="p-4 text-muted-foreground">{timesheet.job_titre}</td>
                  <td className="p-4 text-muted-foreground">{timesheet.debut}</td>
                  <td className="p-4 text-muted-foreground">{timesheet.fin}</td>
                  <td className="p-4 font-semibold">{timesheet.total}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTimesheet(timesheet);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTimesheet(timesheet);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Modifier Pointage</DialogTitle>
          </DialogHeader>
          {selectedTimesheet && (
            <div className="space-y-4">
              <div>
                <Label>Début</Label>
                <Input
                  type="time"
                  value={selectedTimesheet.debut}
                  onChange={(e) => setSelectedTimesheet({ ...selectedTimesheet, debut: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Fin</Label>
                <Input
                  type="time"
                  value={selectedTimesheet.fin}
                  onChange={(e) => setSelectedTimesheet({ ...selectedTimesheet, fin: e.target.value })}
                  className="glass-card"
                />
              </div>
              <Button onClick={handleEditTimesheet} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Enregistrer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce pointage ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTimesheet} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Timesheets;
