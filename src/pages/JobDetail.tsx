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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  checklist?: Array<{ id: string; label: string; done: boolean; note?: string; photo_url?: string }>;
  notes_timeline?: Array<{ at: string; type: string; by: string; meta?: any }>;
  time_entries?: Array<{ id: string; employee_id: string; start_at: string; end_at?: string }>;
  costs?: Array<{ id: string; label: string; qty: number; unit_cost: number }>;
}

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJob = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger le job", variant: "destructive" });
      return;
    }
    setJob(data as unknown as Job);
    setLoading(false);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from("equipe").select("*");
    setEmployees(data || []);
  };

  useEffect(() => {
    loadJob();
    loadEmployees();

    const channel = supabase
      .channel(`job-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `id=eq.${id}` }, loadJob)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleMarkDone = async () => {
    if (!job) return;
    const { error } = await supabase
      .from("jobs")
      .update({
        statut: "Terminé",
        notes_timeline: [
          ...(job.notes_timeline || []),
          { at: new Date().toISOString(), type: "completed", by: "User", meta: {} },
        ],
      })
      .eq("id", job.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Job terminé", description: "Le statut a été mis à jour" });
    loadJob();
  };

  const handleUpdateChecklist = async (checklistIndex: number, done: boolean) => {
    if (!job || !job.checklist) return;
    const updatedChecklist = [...job.checklist];
    updatedChecklist[checklistIndex].done = done;

    const { error } = await supabase.from("jobs").update({ checklist: updatedChecklist }).eq("id", job.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    loadJob();
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!job) return;
    const { error } = await supabase.from("jobs").update({ notes }).eq("id", job.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notes mises à jour" });
    loadJob();
  };

  const getStatusVariant = (status: string) => {
    if (status === "Terminé") return "gray";
    if (status === "En cours") return "blue";
    if (status === "À faire") return "amber";
    return "gray";
  };

  const getStatusLabel = (status: string) => {
    return status;
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
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
          <StatusChip variant={getStatusVariant(job.statut)}>{getStatusLabel(job.statut)}</StatusChip>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {job.statut !== "Terminé" && (
            <Button onClick={handleMarkDone} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Marquer terminé
            </Button>
          )}
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Replanifier
          </Button>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Assigner
          </Button>
        </div>

        {(job.scheduled_start || job.scheduled_end) && (
          <div className="mt-4 text-sm text-muted-foreground">
            Planning:{" "}
            {job.scheduled_start && format(new Date(job.scheduled_start), "PPP à HH:mm")}
            {job.scheduled_end && ` → ${format(new Date(job.scheduled_end), "HH:mm")}`}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
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
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Client</Label>
                <p className="text-sm">{job.client_nom}</p>
              </div>
              {job.adresse && (
                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adresse
                  </Label>
                  <p className="text-sm">{job.adresse}</p>
                </div>
              )}
              <div>
                <Label>Employés assignés</Label>
                <div className="flex gap-2 mt-2">
                  {job.assigned_employee_ids && job.assigned_employee_ids.length > 0 ? (
                    job.assigned_employee_ids.map((empId) => {
                      const emp = employees.find((e) => e.id === empId);
                      return (
                        <span key={empId} className="inline-block px-3 py-1 bg-muted rounded-full text-sm">
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
                  placeholder="Ajouter des notes..."
                  className="mt-2"
                />
                <Button onClick={() => handleUpdateNotes(job.notes || "")} className="mt-2" size="sm">
                  Enregistrer les notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tâches ({Math.round(checklistProgress)}% complété)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.checklist && job.checklist.length > 0 ? (
                job.checklist.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(checked) => handleUpdateChecklist(idx, checked === true)}
                    />
                    <div className="flex-1">
                      <p className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</p>
                      {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune tâche dans la checklist</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments */}
        <TabsContent value="attachments" className="space-y-4">
          <Card>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time & Costs */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Saisies de temps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.time_entries && job.time_entries.length > 0 ? (
                <div className="space-y-2">
                  {job.time_entries.map((entry) => (
                    <div key={entry.id} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span>{employees.find((e) => e.id === entry.employee_id)?.nom || entry.employee_id}</span>
                      <span>
                        {entry.start_at} → {entry.end_at || "En cours"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune saisie de temps</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Coûts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.costs && job.costs.length > 0 ? (
                <div className="space-y-2">
                  {job.costs.map((cost) => (
                    <div key={cost.id} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span>
                        {cost.label} ({cost.qty}x)
                      </span>
                      <span className="font-semibold">€{(cost.qty * cost.unit_cost).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 bg-primary/10 rounded-lg font-bold">
                    <span>Total</span>
                    <span>
                      €{job.costs.reduce((sum, c) => sum + c.qty * c.unit_cost, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucun coût enregistré</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {job.notes_timeline && job.notes_timeline.length > 0 ? (
                <div className="space-y-3">
                  {job.notes_timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-muted/30">
                      <div className="text-sm text-muted-foreground w-32">
                        {format(new Date(event.at), "PPP à HH:mm")}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{event.type}</p>
                        <p className="text-sm text-muted-foreground">Par {event.by}</p>
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
    </div>
  );
};

export default JobDetail;
