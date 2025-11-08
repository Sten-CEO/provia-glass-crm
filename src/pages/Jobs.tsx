import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
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

interface Job {
  id: string;
  titre: string;
  client_id: string | null;
  client_nom: string;
  employe_id: string | null;
  employe_nom: string;
  statut: "À faire" | "En cours" | "Terminé";
  date: string;
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [newJob, setNewJob] = useState({
    titre: "",
    client_id: "",
    employe_id: "",
    statut: "À faire" as const,
    date: new Date().toISOString().split("T")[0],
  });
  const navigate = useNavigate();

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setJobs((data || []) as Job[]);
  };

  const loadData = async () => {
    const { data: clientsData } = await supabase.from("clients").select("id, nom");
    const { data: employesData } = await supabase.from("equipe").select("id, nom");
    setClients(clientsData || []);
    setEmployes(employesData || []);
  };

  useEffect(() => {
    loadJobs();
    loadData();

    const channel = supabase
      .channel("jobs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        loadJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddJob = async () => {
    if (!newJob.titre || !newJob.client_id || !newJob.employe_id) {
      toast.error("Tous les champs requis");
      return;
    }

    const client = clients.find((c) => c.id === newJob.client_id);
    const employe = employes.find((e) => e.id === newJob.employe_id);

    const { error } = await supabase.from("jobs").insert([
      {
        titre: newJob.titre,
        client_id: newJob.client_id,
        client_nom: client?.nom || "",
        employe_id: newJob.employe_id,
        employe_nom: employe?.nom || "",
        statut: newJob.statut,
        date: newJob.date,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Job créé avec succès");
    setNewJob({
      titre: "",
      client_id: "",
      employe_id: "",
      statut: "À faire",
      date: new Date().toISOString().split("T")[0],
    });
    setOpen(false);
  };

  const handleEditJob = async () => {
    if (!selectedJob) return;

    const { error } = await supabase
      .from("jobs")
      .update({
        titre: selectedJob.titre,
        statut: selectedJob.statut,
        date: selectedJob.date,
      })
      .eq("id", selectedJob.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Job modifié avec succès");
    setEditOpen(false);
    setSelectedJob(null);
  };

  const handleDeleteJob = async () => {
    if (!selectedJob) return;

    const { error } = await supabase.from("jobs").delete().eq("id", selectedJob.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Job supprimé avec succès");
    setDeleteOpen(false);
    setSelectedJob(null);
  };

  const getStatusColor = (statut: Job["statut"]) => {
    switch (statut) {
      case "Terminé":
        return "bg-green-500/20 text-green-700";
      case "En cours":
        return "bg-blue-500/20 text-blue-700";
      case "À faire":
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Jobs / Interventions</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Job
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouveau Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input
                  placeholder="Installation système"
                  value={newJob.titre}
                  onChange={(e) => setNewJob({ ...newJob, titre: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Client *</Label>
                <Select value={newJob.client_id} onValueChange={(v) => setNewJob({ ...newJob, client_id: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employé *</Label>
                <Select value={newJob.employe_id} onValueChange={(v) => setNewJob({ ...newJob, employe_id: v })}>
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
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newJob.date}
                  onChange={(e) => setNewJob({ ...newJob, date: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={newJob.statut} onValueChange={(v: any) => setNewJob({ ...newJob, statut: v })}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À faire">À faire</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddJob} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
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
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Titre</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Client</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Employé</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Date</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <button
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="font-medium hover:underline text-left"
                    >
                      {job.titre}
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground">{job.client_nom}</td>
                  <td className="p-4 text-muted-foreground">{job.employe_nom}</td>
                  <td className="p-4 text-muted-foreground">{formatDate(job.date)}</td>
                  <td className="p-4">
                    <Badge className={getStatusColor(job.statut)}>{job.statut}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job);
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
            <DialogTitle className="uppercase tracking-wide">Modifier Job</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div>
                <Label>Titre</Label>
                <Input
                  value={selectedJob.titre}
                  onChange={(e) => setSelectedJob({ ...selectedJob, titre: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedJob.date}
                  onChange={(e) => setSelectedJob({ ...selectedJob, date: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select
                  value={selectedJob.statut}
                  onValueChange={(v: any) => setSelectedJob({ ...selectedJob, statut: v })}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À faire">À faire</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditJob} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
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
              Êtes-vous sûr de vouloir supprimer ce job ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Jobs;
