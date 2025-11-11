import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, Search, MapPin, Users, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadgeIntervention } from "@/components/ui/status-badge-intervention";
import { type InterventionStatus } from "@/lib/interventionStatuses";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
interface Intervention {
  id: string;
  titre: string;
  client_id: string | null;
  client_nom: string;
  employe_id: string | null;
  employe_nom: string;
  statut: InterventionStatus;
  date: string;
  adresse?: string;
  assigned_employee_ids?: string[];
  scheduled_start?: string;
  scheduled_end?: string;
  checklist?: Array<{ id: string; label: string; done: boolean }>;
}

const Interventions = () => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const navigate = useNavigate();

  const loadInterventions = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setInterventions((data || []) as unknown as Intervention[]);
  };

  const loadData = async () => {
    const { data: clientsData } = await supabase.from("clients").select("id, nom");
    const { data: employesData } = await supabase.from("equipe").select("id, nom");
    setClients(clientsData || []);
    setEmployes(employesData || []);
  };

  useEffect(() => {
    loadInterventions();
    loadData();

    const channel = supabase
      .channel("jobs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        loadInterventions();
      })
      .subscribe();

    const handleDataChanged = (data: any) => {
      if (data?.scope === 'jobs' || data?.scope === 'planning' || data?.scope === 'interventions') {
        loadInterventions();
      }
    };

    eventBus.on(EVENTS.DATA_CHANGED, handleDataChanged);

    return () => {
      supabase.removeChannel(channel);
      eventBus.off(EVENTS.DATA_CHANGED, handleDataChanged);
    };
  }, []);

  const handleDeleteIntervention = async () => {
    if (!selectedIntervention) return;

    const { error } = await supabase.from("jobs").delete().eq("id", selectedIntervention.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Intervention supprimée avec succès");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'interventions' });
    setDeleteOpen(false);
    setSelectedIntervention(null);
  };


  const getChecklistProgress = (intervention: Intervention) => {
    if (!intervention.checklist || intervention.checklist.length === 0) return 0;
    return Math.round((intervention.checklist.filter(c => c.done).length / intervention.checklist.length) * 100);
  };

  const formatCreneau = (intervention: Intervention) => {
    if (intervention.scheduled_start) {
      const start = new Date(intervention.scheduled_start);
      const end = intervention.scheduled_end ? new Date(intervention.scheduled_end) : null;
      const dateStr = start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const timeStart = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const timeEnd = end ? end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
      return `${dateStr} ${timeStart}${timeEnd ? `–${timeEnd}` : ""}`;
    }
    return "—";
  };

  const filteredInterventions = interventions.filter(intervention => {
    const matchesSearch = search === "" || 
      intervention.titre.toLowerCase().includes(search.toLowerCase()) ||
      intervention.client_nom.toLowerCase().includes(search.toLowerCase()) ||
      (intervention.adresse && intervention.adresse.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || intervention.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Interventions</h1>

        <Button 
          onClick={() => navigate("/interventions/nouvelle")}
          className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Intervention
        </Button>
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
              <SelectItem value="À planifier">À planifier</SelectItem>
              <SelectItem value="À faire">À faire</SelectItem>
              <SelectItem value="En cours">En cours</SelectItem>
              <SelectItem value="Terminée">Terminée</SelectItem>
              <SelectItem value="Annulée">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
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
              {filteredInterventions.map((intervention) => (
                <tr key={intervention.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/interventions/${intervention.id}`)}>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <StatusBadgeIntervention status={intervention.statut} />
                  </td>
                  <td className="p-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/interventions/${intervention.id}`);
                      }}
                      className="font-medium hover:underline text-left"
                    >
                      {intervention.titre}
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground">{intervention.client_nom}</td>
                  <td className="p-4 text-muted-foreground">
                    {intervention.adresse ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs">{intervention.adresse.substring(0, 30)}{intervention.adresse.length > 30 ? "..." : ""}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="p-4">
                    {intervention.assigned_employee_ids && intervention.assigned_employee_ids.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">
                          {intervention.assigned_employee_ids.length > 3 
                            ? `${intervention.assigned_employee_ids.length} assignés` 
                            : intervention.assigned_employee_ids.map(id => {
                                const emp = employes.find(e => e.id === id);
                                return emp?.nom?.substring(0, 10) || id.substring(0, 6);
                              }).join(", ")}
                        </span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">{formatCreneau(intervention)}</td>
                  <td className="p-4">
                    {intervention.checklist && intervention.checklist.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress value={getChecklistProgress(intervention)} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">{getChecklistProgress(intervention)}%</span>
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
                          navigate(`/interventions/${intervention.id}`);
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
                          navigate(`/interventions/${intervention.id}/editer`);
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
                          setSelectedIntervention(intervention);
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

      {/* Delete Alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette intervention ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIntervention} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Interventions;
