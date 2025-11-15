import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, Search, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkDeleteToolbar } from "@/components/common/BulkDeleteToolbar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { eventBus, EVENTS } from "@/lib/eventBus";

interface Job {
  id: string;
  titre: string;
  client_id: string | null;
  client_nom: string;
  employe_id: string | null;
  employe_nom: string;
  statut: "À faire" | "En cours" | "Terminé" | "Assigné" | "Annulé";
  date: string;
  adresse?: string;
  assigned_employee_ids?: string[];
  scheduled_start?: string;
  scheduled_end?: string;
  checklist?: Array<{ id: string; label: string; done: boolean }>;
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
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

  // Bulk selection for mass delete
  const {
    selectedIds,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
  } = useBulkSelection(jobs);

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setJobs((data || []) as unknown as Job[]);
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

    const handleDataChanged = (data: any) => {
      if (data?.scope === 'jobs' || data?.scope === 'planning') {
        loadJobs();
      }
    };

    eventBus.on(EVENTS.DATA_CHANGED, handleDataChanged);

    return () => {
      supabase.removeChannel(channel);
      eventBus.off(EVENTS.DATA_CHANGED, handleDataChanged);
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

    // Cancel inventory reservations first
    try {
      const { cancelInventoryReservations } = await import("@/lib/interventionInventorySync");
      await cancelInventoryReservations(selectedJob.id);
    } catch (error) {
      console.error("Error canceling inventory:", error);
    }

    const { error } = await supabase.from("jobs").delete().eq("id", selectedJob.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Job supprimé avec succès");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs' });
    setDeleteOpen(false);
    setSelectedJob(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const { error } = await supabase
      .from("jobs")
      .delete()
      .in("id", selectedIds);

    if (error) {
      console.error("Erreur lors de la suppression groupée:", error);
      toast.error("Échec de la suppression groupée");
      return;
    }

    toast.success(`${selectedIds.length} job${selectedIds.length > 1 ? "s supprimés" : " supprimé"} avec succès`);
    clearSelection();
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs' });
  };

  const getStatusVariant = (statut: Job["statut"]) => {
    if (statut === "Terminé") return "gray";
    if (statut === "En cours") return "amber";
    if (statut === "Assigné" || statut === "À faire") return "blue";
    if (statut === "Annulé") return "red";
    return "gray";
  };

  const getChecklistProgress = (job: Job) => {
    if (!job.checklist || job.checklist.length === 0) return 0;
    return Math.round((job.checklist.filter(c => c.done).length / job.checklist.length) * 100);
  };

  const formatCreneau = (job: Job) => {
    if (job.scheduled_start) {
      const start = new Date(job.scheduled_start);
      const end = job.scheduled_end ? new Date(job.scheduled_end) : null;
      const dateStr = start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const timeStart = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const timeEnd = end ? end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
      return `${dateStr} ${timeStart}${timeEnd ? `–${timeEnd}` : ""}`;
    }
    return "—";
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = search === "" || 
      job.titre.toLowerCase().includes(search.toLowerCase()) ||
      job.client_nom.toLowerCase().includes(search.toLowerCase()) ||
      (job.adresse && job.adresse.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || job.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

      {/* Search and Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, client, adresse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="À faire">À faire</SelectItem>
              <SelectItem value="Assigné">Assigné</SelectItem>
              <SelectItem value="En cours">En cours</SelectItem>
              <SelectItem value="Terminé">Terminé</SelectItem>
              <SelectItem value="Annulé">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <BulkDeleteToolbar
            selectedCount={selectedCount}
            totalCount={filteredJobs.length}
            onSelectAll={toggleAll}
            onDelete={handleBulkDelete}
            entityName="job"
            allSelected={allSelected}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm w-8">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Titre</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Client</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Adresse</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Assignés</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Créneau</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Progression</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected(job.id)}
                      onCheckedChange={() => toggleItem(job.id)}
                      aria-label={`Sélectionner ${job.titre}`}
                    />
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <StatusChip variant={getStatusVariant(job.statut)}>{job.statut}</StatusChip>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/${job.id}`);
                      }}
                      className="font-medium hover:underline text-left"
                    >
                      {job.titre}
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground">{job.client_nom}</td>
                  <td className="p-4 text-muted-foreground">
                    {job.adresse ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs">{job.adresse.substring(0, 30)}{job.adresse.length > 30 ? "..." : ""}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="p-4">
                    {job.assigned_employee_ids && job.assigned_employee_ids.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">
                          {job.assigned_employee_ids.length > 3 
                            ? `${job.assigned_employee_ids.length} assignés` 
                            : job.assigned_employee_ids.map(id => {
                                const emp = employes.find(e => e.id === id);
                                return emp?.nom?.substring(0, 10) || id.substring(0, 6);
                              }).join(", ")}
                        </span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">{formatCreneau(job)}</td>
                  <td className="p-4">
                    {job.checklist && job.checklist.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress value={getChecklistProgress(job)} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">{getChecklistProgress(job)}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                        title="Voir fiche"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          setEditOpen(true);
                        }}
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          setDeleteOpen(true);
                        }}
                        title="Supprimer"
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
