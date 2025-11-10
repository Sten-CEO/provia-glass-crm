import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Edit, Check, Copy, X, Settings, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RecurrencePanel } from "@/components/interventions/RecurrencePanel";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { cancelInventoryReservations } from "@/lib/interventionInventorySync";
import { consumeReservedInventory } from "@/lib/interventionInventorySync";

export default function InterventionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        clients:client_id (nom, email, telephone, adresse, ville),
        contracts:contract_id (contract_number, title)
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement de l'intervention");
      return;
    }

    setJob(data);
    setLoading(false);
  };

  const handleMarkComplete = async () => {
    if (!id || !job) return;

    const { error } = await supabase
      .from("jobs")
      .update({ statut: "Terminé" })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    // Consume reserved inventory
    try {
      await consumeReservedInventory(
        id,
        job.intervention_number || "INT-" + id
      );
      toast.success("Intervention marquée comme terminée et stock mis à jour");
    } catch (error) {
      console.error("Error consuming inventory:", error);
      toast.success("Intervention marquée comme terminée (erreur mise à jour stock)");
    }

    eventBus.emit(EVENTS.JOB_COMPLETED, { jobId: id });
    loadJob();
  };

  const handleDuplicate = async () => {
    if (!job) return;

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        titre: `${job.titre} (copie)`,
        client_id: job.client_id,
        client_nom: job.client_nom,
        employe_id: job.employe_id,
        employe_nom: job.employe_nom,
        date: job.date,
        statut: "À faire",
        type: job.type,
        zone: job.zone,
        adresse: job.adresse,
        description: job.description,
        notes: job.notes,
        checklist: job.checklist,
        assigned_employee_ids: job.assigned_employee_ids,
        contract_id: job.contract_id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la duplication");
      return;
    }

    toast.success("Intervention dupliquée");
    navigate(`/interventions/${data.id}`);
  };

  const handleCancel = async () => {
    if (!id) return;

    const { error } = await supabase
      .from("jobs")
      .update({ statut: "Annulé" })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de l'annulation");
      return;
    }

    // Cancel inventory reservations
    try {
      await cancelInventoryReservations(id);
      toast.success("Intervention annulée et réservations stock annulées");
    } catch (error) {
      console.error("Error canceling reservations:", error);
      toast.success("Intervention annulée (erreur annulation réservations)");
    }

    eventBus.emit(EVENTS.JOB_CANCELED, { jobId: id });
    loadJob();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Intervention non trouvée</p>
          <Button onClick={() => navigate("/interventions")} className="mt-4">
            Retour aux interventions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{job.titre}</h1>
            <p className="text-muted-foreground">
              {job.clients?.nom} • {new Date(job.date).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" title="Options d'affichage">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" title="Créer une récurrence" onClick={() => setRecurrenceOpen(true)}>
            <Repeat className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="data">Données</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="report">Rapport</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="geoloc">Géolocalisation</TabsTrigger>
          <TabsTrigger value="files">Fichiers</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-6 mt-6">
          {/* Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Statut & Actions</span>
                <Badge variant={job.statut === "Terminé" ? "default" : job.statut === "Annulé" ? "destructive" : "secondary"}>
                  {job.statut}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate(`/interventions/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              {job.statut !== "Terminé" && job.statut !== "Annulé" && (
                <Button onClick={handleMarkComplete}>
                  <Check className="h-4 w-4 mr-2" />
                  Marquer terminée
                </Button>
              )}
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </Button>
              {job.statut !== "Annulé" && (
                <Button variant="destructive" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client</p>
                  <p className="text-base">{job.clients?.nom || job.client_nom}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <p className="text-base">{job.clients?.email || "-"}</p>
                  <p className="text-base">{job.clients?.telephone || "-"}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Adresse d'intervention</p>
                <p className="text-base">{job.adresse || job.clients?.adresse || "-"}</p>
                <p className="text-base">{job.lieu || job.clients?.ville || "-"}</p>
              </div>
              {job.contracts && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contrat lié</p>
                    <p className="text-base">{job.contracts.contract_number} - {job.contracts.title}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Intervention Details */}
          <Card>
            <CardHeader>
              <CardTitle>Détails de l'intervention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-base">{job.type || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zone</p>
                  <p className="text-base">{job.zone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Équipe</p>
                  <p className="text-base">{job.employe_nom || "-"}</p>
                </div>
              </div>
              {(job.heure_debut || job.heure_fin) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Heure début</p>
                      <p className="text-base">{job.heure_debut || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Heure fin</p>
                      <p className="text-base">{job.heure_fin || "-"}</p>
                    </div>
                  </div>
                </>
              )}
              {job.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-base whitespace-pre-wrap">{job.description}</p>
                  </div>
                </>
              )}
              {job.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes internes</p>
                    <p className="text-base whitespace-pre-wrap">{job.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Checklist */}
          {job.checklist && job.checklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.checklist.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={item.checked} 
                        readOnly 
                        className="rounded"
                      />
                      <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                        {item.label || item.text || item}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapport d'intervention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="satisfaction" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Satisfaction client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geoloc" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Géolocalisation</CardTitle>
            </CardHeader>
            <CardContent>
              {job.location_gps ? (
                <div>
                  <p className="text-sm">Coordonnées : {JSON.stringify(job.location_gps)}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Aucune géolocalisation enregistrée</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fichiers joints</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recurrence Panel */}
      <RecurrencePanel open={recurrenceOpen} onOpenChange={setRecurrenceOpen} sourceJob={job} />
    </div>
  );
}
