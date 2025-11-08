import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusChip } from "@/components/ui/status-chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle,
  Calendar,
  Users,
  FileText,
  Clock,
  DollarSign,
  Upload,
  MapPin,
  Edit,
  Plus,
  Trash2,
  ExternalLink,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { eventBus, EVENTS } from "@/lib/eventBus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Job {
  id: string;
  titre: string;
  client_id: string;
  client_nom: string;
  employe_id?: string;
  employe_nom?: string;
  statut: string;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
  adresse?: string;
  lieu?: string;
  notes?: string;
  description?: string;
  type?: string;
  zone?: string;
  location_gps?: { lat: number; lng: number };
  scheduled_start?: string;
  scheduled_end?: string;
  assigned_employee_ids?: string[];
  checklist?: Array<{ id: string; label: string; done: boolean; note?: string; photo_url?: string; sort?: number }>;
  notes_timeline?: Array<{ at: string; type: string; by: string; meta?: any }>;
  time_entries?: Array<{ id: string; employee_id: string; start_at: string; end_at?: string }>;
  costs?: Array<{ id: string; label: string; qty: number; unit_cost: number }>;
  linked_quote_id?: string;
  linked_invoice_id?: string;
  planning_event_id?: string;
}

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newTimeEntry, setNewTimeEntry] = useState({ employee_id: "", start_at: "", end_at: "" });
  const [newCost, setNewCost] = useState({ label: "", qty: 1, unit_cost: 0 });

  const loadJob = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (error) {
      toast.error("Erreur", { description: "Impossible de charger le job" });
      return;
    }
    setJob(data as unknown as Job);
    setLoading(false);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from("equipe").select("*");
    setEmployees(data || []);
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*");
    setClients(data || []);
  };

  useEffect(() => {
    loadJob();
    loadEmployees();
    loadClients();

    const channel = supabase
      .channel(`job-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `id=eq.${id}` }, loadJob)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const addHistoryEvent = async (type: string, meta?: any) => {
    if (!job) return;
    const newTimeline = [
      ...(job.notes_timeline || []),
      { at: new Date().toISOString(), type, by: "User", meta: meta || {} },
    ];
    await supabase.from("jobs").update({ notes_timeline: newTimeline }).eq("id", job.id);
  };

  const handleMarkDone = async () => {
    if (!job) return;
    const { error } = await supabase
      .from("jobs")
      .update({ statut: "Terminé" })
      .eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    await addHistoryEvent("completed");
    toast.success("Job marqué comme terminé");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const handleAssign = async (employeeIds: string[]) => {
    if (!job) return;
    const { error } = await supabase
      .from("jobs")
      .update({ assigned_employee_ids: employeeIds })
      .eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    await addHistoryEvent("assigned", { employees: employeeIds });
    toast.success("Employés assignés");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    setAssignOpen(false);
    loadJob();
  };

  const handleReschedule = async (start: string, end: string) => {
    if (!job) return;
    
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ scheduled_start: start, scheduled_end: end })
      .eq("id", job.id);

    if (jobError) {
      toast.error("Erreur", { description: jobError.message });
      return;
    }

    // Update or create planning event
    if (job.planning_event_id) {
      await supabase
        .from("planning_events")
        .update({ start_at: start, end_at: end })
        .eq("id", job.planning_event_id);
    } else {
      const { data } = await supabase
        .from("planning_events")
        .insert({
          job_id: job.id,
          title: job.titre,
          start_at: start,
          end_at: end,
          employee_ids: job.assigned_employee_ids || [],
        })
        .select()
        .single();

      if (data) {
        await supabase.from("jobs").update({ planning_event_id: data.id }).eq("id", job.id);
      }
    }

    await addHistoryEvent("rescheduled", { start, end });
    toast.success("Job replanifié");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'planning' });
    setRescheduleOpen(false);
    loadJob();
  };

  const handleUpdateChecklist = async (index: number, done: boolean) => {
    if (!job || !job.checklist) return;
    const updatedChecklist = [...job.checklist];
    updatedChecklist[index].done = done;

    const { error } = await supabase.from("jobs").update({ checklist: updatedChecklist }).eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const handleAddChecklistItem = async () => {
    if (!job || !newChecklistItem.trim()) return;
    const updatedChecklist = [
      ...(job.checklist || []),
      { id: crypto.randomUUID(), label: newChecklistItem, done: false, sort: (job.checklist?.length || 0) + 1 },
    ];

    const { error } = await supabase.from("jobs").update({ checklist: updatedChecklist }).eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    setNewChecklistItem("");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const handleDeleteChecklistItem = async (index: number) => {
    if (!job || !job.checklist) return;
    const updatedChecklist = job.checklist.filter((_, i) => i !== index);

    const { error } = await supabase.from("jobs").update({ checklist: updatedChecklist }).eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!job) return;
    const { error } = await supabase.from("jobs").update({ [field]: value }).eq("id", job.id);
    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }
    toast.success("Champ mis à jour");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const handleAddTimeEntry = async () => {
    if (!job || !newTimeEntry.employee_id || !newTimeEntry.start_at) return;
    const updatedEntries = [
      ...(job.time_entries || []),
      { id: crypto.randomUUID(), ...newTimeEntry },
    ];

    const { error } = await supabase.from("jobs").update({ time_entries: updatedEntries }).eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    setNewTimeEntry({ employee_id: "", start_at: "", end_at: "" });
    toast.success("Saisie de temps ajoutée");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const handleAddCost = async () => {
    if (!job || !newCost.label || newCost.qty <= 0) return;
    const updatedCosts = [
      ...(job.costs || []),
      { id: crypto.randomUUID(), ...newCost },
    ];

    const { error } = await supabase.from("jobs").update({ costs: updatedCosts }).eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    setNewCost({ label: "", qty: 1, unit_cost: 0 });
    toast.success("Coût ajouté");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const handleDeleteCost = async (index: number) => {
    if (!job || !job.costs) return;
    const updatedCosts = job.costs.filter((_, i) => i !== index);

    const { error } = await supabase.from("jobs").update({ costs: updatedCosts }).eq("id", job.id);

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs', id: job.id });
    loadJob();
  };

  const getStatusVariant = (status: string) => {
    if (status === "Terminé") return "gray";
    if (status === "En cours") return "amber";
    if (status === "Assigné" || status === "À faire") return "blue";
    if (status === "Annulé") return "red";
    return "gray";
  };

  const openGoogleMaps = () => {
    if (job?.adresse) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.adresse)}`, "_blank");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!job) {
    return (
      <div className="p-6">
        <p>Job non trouvé</p>
        <Button onClick={() => navigate("/jobs")} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  const checklistProgress = job.checklist
    ? (job.checklist.filter((c) => c.done).length / job.checklist.length) * 100
    : 0;

  const totalCosts = (job.costs || []).reduce((sum, c) => sum + c.qty * c.unit_cost, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold uppercase tracking-wide">{job.titre}</h1>
              <p className="text-muted-foreground">
                Client:{" "}
                <button
                  onClick={() => navigate(`/clients/${job.client_id}`)}
                  className="underline hover:text-primary"
                >
                  {job.client_nom}
                </button>
              </p>
            </div>
          </div>
          <StatusChip variant={getStatusVariant(job.statut)}>{job.statut}</StatusChip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
          {(job.scheduled_start || job.scheduled_end) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {job.scheduled_start && format(new Date(job.scheduled_start), "PPP à HH:mm", { locale: fr })}
                {job.scheduled_end && ` → ${format(new Date(job.scheduled_end), "HH:mm")}`}
              </span>
            </div>
          )}
          {job.adresse && (
            <button
              onClick={openGoogleMaps}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <MapPin className="h-4 w-4" />
              <span className="underline">{job.adresse}</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Progression: {Math.round(checklistProgress)}%</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {job.statut !== "Terminé" && (
            <Button onClick={handleMarkDone} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Marquer terminé
            </Button>
          )}
          <Button variant="outline" onClick={() => setRescheduleOpen(true)} className="gap-2">
            <Calendar className="h-4 w-4" />
            Replanifier
          </Button>
          <Button variant="outline" onClick={() => setAssignOpen(true)} className="gap-2">
            <Users className="h-4 w-4" />
            Assigner
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {/* TODO: Duplicate */}}>
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateField("statut", "Annulé")}
                className="text-destructive"
              >
                Annuler job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-5 glass-card">
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="checklist">
            Checklist {job.checklist && `(${Math.round(checklistProgress)}%)`}
          </TabsTrigger>
          <TabsTrigger value="attachments">Pièces jointes</TabsTrigger>
          <TabsTrigger value="time">Temps & coûts</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {/* Détails */}
        <TabsContent value="details" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={job.titre}
                    onChange={(e) => setJob({ ...job, titre: e.target.value })}
                    onBlur={() => handleUpdateField("titre", job.titre)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Client</Label>
                  <Select
                    value={job.client_id}
                    onValueChange={(v) => {
                      const client = clients.find(c => c.id === v);
                      handleUpdateField("client_id", v);
                      if (client) handleUpdateField("client_nom", client.nom);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Adresse</Label>
                <Input
                  value={job.adresse || ""}
                  onChange={(e) => setJob({ ...job, adresse: e.target.value })}
                  onBlur={() => handleUpdateField("adresse", job.adresse)}
                  className="mt-1"
                  placeholder="Adresse du chantier"
                />
              </div>

              <div>
                <Label>Statut</Label>
                <Select value={job.statut} onValueChange={(v) => handleUpdateField("statut", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À faire">À faire</SelectItem>
                    <SelectItem value="Assigné">Assigné</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                    <SelectItem value="Annulé">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Employés assignés</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {job.assigned_employee_ids && job.assigned_employee_ids.length > 0 ? (
                    job.assigned_employee_ids.map((empId) => {
                      const emp = employees.find((e) => e.id === empId);
                      return (
                        <span key={empId} className="inline-block px-3 py-1 bg-primary/10 rounded-full text-sm">
                          {emp?.nom || empId}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">Aucun employé assigné</span>
                  )}
                </div>
              </div>

              <div>
                <Label>Notes internes</Label>
                <Textarea
                  value={job.notes || ""}
                  onChange={(e) => setJob({ ...job, notes: e.target.value })}
                  onBlur={() => handleUpdateField("notes", job.notes)}
                  placeholder="Ajouter des notes..."
                  className="mt-1"
                  rows={4}
                />
              </div>

              {(job.linked_quote_id || job.linked_invoice_id) && (
                <div className="pt-4 border-t">
                  <Label>Documents liés</Label>
                  <div className="flex gap-2 mt-2">
                    {job.linked_quote_id && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/devis/${job.linked_quote_id}`)}>
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Voir devis
                      </Button>
                    )}
                    {job.linked_invoice_id && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/factures/${job.linked_invoice_id}`)}>
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Voir facture
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tâches ({Math.round(checklistProgress)}% complété)</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {job.checklist?.filter(c => c.done).length || 0} / {job.checklist?.length || 0}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.checklist && job.checklist.length > 0 ? (
                job.checklist.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 group">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(checked) => handleUpdateChecklist(idx, checked === true)}
                    />
                    <div className="flex-1">
                      <p className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</p>
                      {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChecklistItem(idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune tâche dans la checklist</p>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Input
                  placeholder="Nouvelle tâche..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddChecklistItem()}
                />
                <Button onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments */}
        <TabsContent value="attachments" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pièces jointes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Glissez vos fichiers ici ou cliquez pour uploader</p>
                <Button variant="outline" className="mt-4">
                  Parcourir
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Note: L'upload de fichiers nécessite la configuration du Storage Lovable Cloud.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time & Costs */}
        <TabsContent value="time" className="space-y-4">
          {/* Time Entries */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Saisies de temps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.time_entries && job.time_entries.length > 0 ? (
                <div className="space-y-2">
                  {job.time_entries.map((entry) => {
                    const emp = employees.find((e) => e.id === entry.employee_id);
                    return (
                      <div key={entry.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{emp?.nom || entry.employee_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.start_at} → {entry.end_at || "En cours"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucune saisie de temps</p>
              )}

              <div className="pt-4 border-t space-y-3">
                <Label>Ajouter une saisie</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select
                    value={newTimeEntry.employee_id}
                    onValueChange={(v) => setNewTimeEntry({ ...newTimeEntry, employee_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Employé" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="datetime-local"
                    value={newTimeEntry.start_at}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, start_at: e.target.value })}
                  />
                  <Input
                    type="datetime-local"
                    value={newTimeEntry.end_at}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, end_at: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddTimeEntry} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Costs */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Coûts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.costs && job.costs.length > 0 ? (
                <div className="space-y-2">
                  {job.costs.map((cost, idx) => (
                    <div key={cost.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg group">
                      <div>
                        <p className="font-medium">{cost.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {cost.qty} × €{cost.unit_cost.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">€{(cost.qty * cost.unit_cost).toFixed(2)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCost(idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 bg-primary/10 rounded-lg font-bold">
                    <span>Total</span>
                    <span>€{totalCosts.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucun coût enregistré</p>
              )}

              <div className="pt-4 border-t space-y-3">
                <Label>Ajouter un coût</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Description"
                    value={newCost.label}
                    onChange={(e) => setNewCost({ ...newCost, label: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Quantité"
                    value={newCost.qty}
                    onChange={(e) => setNewCost({ ...newCost, qty: parseFloat(e.target.value) || 1 })}
                  />
                  <Input
                    type="number"
                    placeholder="Prix unitaire"
                    value={newCost.unit_cost}
                    onChange={(e) => setNewCost({ ...newCost, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button onClick={handleAddCost} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {job.notes_timeline && job.notes_timeline.length > 0 ? (
                <div className="space-y-3">
                  {job.notes_timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-muted/30">
                      <div className="text-sm text-muted-foreground w-40 shrink-0">
                        {format(new Date(event.at), "PPP à HH:mm", { locale: fr })}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{event.type.replace(/_/g, " ")}</p>
                        <p className="text-sm text-muted-foreground">Par {event.by}</p>
                        {event.meta && Object.keys(event.meta).length > 0 && (
                          <pre className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(event.meta, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucun historique</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle>Assigner des employés</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {employees.map((emp) => {
              const isAssigned = job.assigned_employee_ids?.includes(emp.id);
              return (
                <div key={emp.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={(checked) => {
                      const current = job.assigned_employee_ids || [];
                      const updated = checked
                        ? [...current, emp.id]
                        : current.filter((id) => id !== emp.id);
                      setJob({ ...job, assigned_employee_ids: updated });
                    }}
                  />
                  <span>{emp.nom}</span>
                </div>
              );
            })}
            <Button onClick={() => handleAssign(job.assigned_employee_ids || [])} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle>Replanifier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Début</Label>
              <Input
                type="datetime-local"
                defaultValue={job.scheduled_start || ""}
                id="reschedule-start"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type="datetime-local"
                defaultValue={job.scheduled_end || ""}
                id="reschedule-end"
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => {
                const start = (document.getElementById("reschedule-start") as HTMLInputElement).value;
                const end = (document.getElementById("reschedule-end") as HTMLInputElement).value;
                if (start && end) {
                  handleReschedule(start, end);
                }
              }}
              className="w-full"
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;
