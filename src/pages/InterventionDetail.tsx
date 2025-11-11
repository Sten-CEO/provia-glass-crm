import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Settings, Repeat } from "lucide-react";
import { toast } from "sonner";
import { RecurrencePanel } from "@/components/interventions/RecurrencePanel";
import { InterventionDataTab } from "@/components/interventions/InterventionDataTab";
import { InterventionHistoryTab } from "@/components/interventions/InterventionHistoryTab";
import { InterventionReportTab } from "@/components/interventions/InterventionReportTab";
import { InterventionSatisfactionTab } from "@/components/interventions/InterventionSatisfactionTab";
import { InterventionGeolocationTab } from "@/components/interventions/InterventionGeolocationTab";
import { FilesSection } from "@/components/interventions/FilesSection";

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

    // Log view action
    await supabase.from("intervention_logs").insert({
      intervention_id: id,
      action: "Consultation",
      details: "Fiche d'intervention consultée"
    });
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
          <InterventionDataTab job={job} onUpdate={loadJob} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <InterventionHistoryTab interventionId={id!} />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <InterventionReportTab job={job} onUpdate={loadJob} />
        </TabsContent>

        <TabsContent value="satisfaction" className="mt-6">
          <InterventionSatisfactionTab interventionId={id!} />
        </TabsContent>

        <TabsContent value="geoloc" className="mt-6">
          <InterventionGeolocationTab job={job} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesSection interventionId={id} />
        </TabsContent>
      </Tabs>

      {/* Recurrence Panel */}
      <RecurrencePanel open={recurrenceOpen} onOpenChange={setRecurrenceOpen} sourceJob={job} />
    </div>
  );
}
