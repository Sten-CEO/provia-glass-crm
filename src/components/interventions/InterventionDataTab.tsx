import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, FileText, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { completeInterventionStock, cancelInterventionStock } from "@/lib/interventionStockService";
import { eventBus, EVENTS } from "@/lib/eventBus";

interface InterventionDataTabProps {
  job: any;
  onUpdate: () => void;
}

export function InterventionDataTab({ job, onUpdate }: InterventionDataTabProps) {
  const navigate = useNavigate();

  const handleMarkComplete = async () => {
    if (!job.id) return;

    const { error } = await supabase
      .from("jobs")
      .update({ statut: "Terminée" })
      .eq("id", job.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    // Process stock: consume consumables, return materials
    try {
      await completeInterventionStock(
        job.id,
        job.intervention_number || "INT-" + job.id
      );
      
      // Log action
      await supabase.from("intervention_logs").insert({
        intervention_id: job.id,
        action: "Marquée comme terminée",
        details: "L'intervention a été marquée comme terminée. Consommables déduits, matériaux restitués."
      });

      toast.success("Intervention terminée - Stock mis à jour");
    } catch (error) {
      console.error("Error processing stock:", error);
      toast.success("Intervention marquée comme terminée (erreur mise à jour stock)");
    }

    eventBus.emit(EVENTS.JOB_COMPLETED, { jobId: job.id });
    onUpdate();
  };

  const handleCancel = async () => {
    if (!job.id) return;

    const { error } = await supabase
      .from("jobs")
      .update({ statut: "Annulée" })
      .eq("id", job.id);

    if (error) {
      toast.error("Erreur lors de l'annulation");
      return;
    }

    try {
      await cancelInterventionStock(
        job.id,
        job.intervention_number || "INT-" + job.id
      );
      
      // Log action
      await supabase.from("intervention_logs").insert({
        intervention_id: job.id,
        action: "Annulée",
        details: "L'intervention a été annulée et toutes les réservations stock ont été libérées"
      });

      toast.success("Intervention annulée - Réservations libérées");
    } catch (error) {
      console.error("Error canceling reservations:", error);
      toast.success("Intervention annulée (erreur annulation réservations)");
    }

    eventBus.emit(EVENTS.JOB_CANCELED, { jobId: job.id });
    onUpdate();
  };

  const handleCreateInvoice = () => {
    navigate(`/factures/nouvelle?intervention=${job.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Status & Actions */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Statut & Actions</span>
            <Badge variant={job.statut === "Terminée" ? "default" : job.statut === "Annulée" ? "destructive" : "secondary"}>
              {job.statut}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/interventions/${job.id}/editer`)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          {job.statut !== "Terminée" && job.statut !== "Annulée" && (
            <Button onClick={handleMarkComplete}>
              <Check className="h-4 w-4 mr-2" />
              Marquer terminée
            </Button>
          )}
          {job.statut !== "Annulée" && (
            <Button variant="destructive" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          {job.statut === "Terminée" && !job.invoice_id && (
            <Button onClick={handleCreateInvoice}>
              <FileText className="h-4 w-4 mr-2" />
              Créer une facture
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Informations principales */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Informations principales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Numéro</p>
              <p className="text-base">{job.intervention_number || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-base">{job.type || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Priorité</p>
              <p className="text-base">{job.priority || "Normale"}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date prévue</p>
              <p className="text-base">{new Date(job.date).toLocaleDateString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horaires</p>
              <p className="text-base">
                {job.heure_debut && job.heure_fin 
                  ? `${job.heure_debut} - ${job.heure_fin}`
                  : job.heure_debut || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Info */}
      <Card className="bg-card/50 backdrop-blur">
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
      <Card className="bg-card/50 backdrop-blur">
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
              <p className="text-sm font-medium text-muted-foreground">Technicien</p>
              <p className="text-base">{job.employe_nom || "-"}</p>
            </div>
          </div>
          {job.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-base whitespace-pre-wrap">{job.description}</p>
              </div>
            </>
          )}
          {job.internal_notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes internes</p>
                <p className="text-base whitespace-pre-wrap">{job.internal_notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rattachements */}
      {(job.quote_id || job.invoice_id) && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Rattachements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {job.quote_id && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Devis lié</span>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/devis/${job.quote_id}`)}>
                  Voir le devis
                </Button>
              </div>
            )}
            {job.invoice_id && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Facture liée</span>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/factures/${job.invoice_id}`)}>
                  Voir la facture
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
