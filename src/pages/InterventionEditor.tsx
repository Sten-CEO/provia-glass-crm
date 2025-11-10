import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, FileText, CheckCircle2 } from "lucide-react";
import { GeneralInfoSection } from "@/components/interventions/GeneralInfoSection";
import { ConsumablesSection } from "@/components/interventions/ConsumablesSection";
import { ServicesSection } from "@/components/interventions/ServicesSection";
import { TimesheetsSection } from "@/components/interventions/TimesheetsSection";
import { FilesSection } from "@/components/interventions/FilesSection";
import { NotesSignatureSection } from "@/components/interventions/NotesSignatureSection";
import { InvoiceSection } from "@/components/interventions/InvoiceSection";

export default function InterventionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intervention, setIntervention] = useState<any>(null);

  // Charger l'intervention si mode édition
  useEffect(() => {
    if (isEditMode) {
      loadIntervention();
    } else {
      initNewIntervention();
    }
  }, [id]);

  const initNewIntervention = async () => {
    // Générer un numéro d'intervention
    const { data: numberData } = await supabase.rpc("generate_intervention_number");
    
    setIntervention({
      intervention_number: numberData || "INT-2025-0001",
      titre: "",
      client_id: null,
      client_nom: "",
      adresse: "",
      employe_id: null,
      employe_nom: "",
      assigned_employee_ids: [],
      date: new Date().toISOString().split("T")[0],
      heure_debut: "08:00",
      heure_fin: "17:00",
      duration_estimated: 480, // 8 heures
      statut: "À planifier",
      type: "Maintenance",
      priority: "normale",
      description: "",
      internal_notes: "",
      client_notes: "",
      quote_id: null,
      invoice_id: null,
      contract_id: null,
    });
  };

  const loadIntervention = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setIntervention(data);
    } catch (error) {
      console.error("Erreur chargement intervention:", error);
      toast.error("Impossible de charger l'intervention");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!intervention.titre || !intervention.client_nom) {
      toast.error("Le titre et le client sont obligatoires");
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const { error } = await supabase
          .from("jobs")
          .update(intervention)
          .eq("id", id);
        
        if (error) throw error;
        toast.success("Intervention mise à jour");
      } else {
        const { data, error } = await supabase
          .from("jobs")
          .insert([intervention])
          .select()
          .single();
        
        if (error) throw error;
        toast.success("Intervention créée");
        navigate(`/interventions/${data.id}`);
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!isEditMode) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ statut: "Terminée", duration_actual: calculateActualDuration() })
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Intervention marquée comme terminée");
      loadIntervention();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!isEditMode || !intervention) return;
    
    navigate(`/factures/nouvelle?intervention=${id}`);
  };

  const calculateActualDuration = () => {
    // Calculer à partir des temps saisis
    // TODO: implémenter le calcul réel depuis timesheets_entries
    return intervention.duration_estimated || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!intervention) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/interventions")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {isEditMode ? `Intervention ${intervention.intervention_number}` : "Nouvelle Intervention"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {intervention.client_nom || "Aucun client sélectionné"}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isEditMode && intervention.statut !== "Terminée" && (
                <Button variant="outline" onClick={handleMarkComplete} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer terminée
                </Button>
              )}
              {isEditMode && intervention.statut === "Terminée" && !intervention.invoice_id && (
                <Button variant="outline" onClick={handleCreateInvoice}>
                  <FileText className="h-4 w-4 mr-2" />
                  Créer facture
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted/40 p-1">
            <TabsTrigger value="general">Informations générales</TabsTrigger>
            <TabsTrigger value="consumables">Consommables / Matériaux</TabsTrigger>
            <TabsTrigger value="services">Services / Prestations</TabsTrigger>
            <TabsTrigger value="timesheets">Temps passé</TabsTrigger>
            <TabsTrigger value="files">Fichiers & Photos</TabsTrigger>
            <TabsTrigger value="notes">Notes & Signature</TabsTrigger>
            {isEditMode && <TabsTrigger value="invoice">Facturation</TabsTrigger>}
          </TabsList>

          <TabsContent value="general">
            <GeneralInfoSection intervention={intervention} onChange={setIntervention} />
          </TabsContent>

          <TabsContent value="consumables">
            <ConsumablesSection interventionId={id} />
          </TabsContent>

          <TabsContent value="services">
            <ServicesSection interventionId={id} />
          </TabsContent>

          <TabsContent value="timesheets">
            <TimesheetsSection interventionId={id} />
          </TabsContent>

          <TabsContent value="files">
            <FilesSection interventionId={id} />
          </TabsContent>

          <TabsContent value="notes">
            <NotesSignatureSection intervention={intervention} onChange={setIntervention} />
          </TabsContent>

          {isEditMode && (
            <TabsContent value="invoice">
              <InvoiceSection intervention={intervention} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
