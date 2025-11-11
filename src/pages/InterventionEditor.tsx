import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createInvoiceFromIntervention } from "@/lib/invoiceConversion";
import {
  consumeReservedInventory,
  cancelInventoryReservations,
  reserveInventoryForIntervention,
  rescheduleInventoryReservations
} from "@/lib/interventionInventorySync";
import { syncQuoteConsumablesToIntervention } from "@/lib/quoteToInterventionSync";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, FileText, CheckCircle2, Repeat, Settings } from "lucide-react";
import { GeneralInfoSection } from "@/components/interventions/GeneralInfoSection";
import { ConsumablesSection } from "@/components/interventions/ConsumablesSection";
import { ServicesSection } from "@/components/interventions/ServicesSection";
import { TimesheetsSection } from "@/components/interventions/TimesheetsSection";
import { FilesSection } from "@/components/interventions/FilesSection";
import { NotesSignatureSection } from "@/components/interventions/NotesSignatureSection";
import { InvoiceSection } from "@/components/interventions/InvoiceSection";
import { RecurrenceDialog } from "@/components/interventions/RecurrenceDialog";
import { DisplayOptionsPanel } from "@/components/common/DisplayOptionsPanel";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";

export default function InterventionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intervention, setIntervention] = useState<any>(null);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);

  const availableSections = [
    { key: "client_info", label: "Informations client" },
    { key: "employee_info", label: "Informations employé / technicien" },
    { key: "category_contract", label: "Catégorie & contrat" },
    { key: "travel_expenses", label: "Frais de déplacement" },
    { key: "materials", label: "Matériels / consommables utilisés" },
    { key: "equipment", label: "Équipements" },
    { key: "internal_notes", label: "Notes internes secrétariat" },
    { key: "satisfaction", label: "Satisfaction client / suivi qualité" },
    { key: "gps", label: "Coordonnées GPS / géolocalisation" },
    { key: "documents", label: "Documents joints / photos" },
    { key: "history", label: "Historique interventions précédentes" },
  ];

  const {
    settings: displaySettings,
    loading: displayLoading,
    toggleColumn,
    saveView,
    deleteView,
    applyView,
  } = useDisplaySettings("intervention", availableSections.map(s => s.key));

  // Charger l'intervention si mode édition
  useEffect(() => {
    if (isEditMode) {
      loadIntervention();
    } else {
      initNewIntervention();
    }
  }, [id]);

  const initNewIntervention = async () => {
    // Check for quoteId in URL params
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get('quoteId');

    // Générer un numéro d'intervention
    const { data: numberData } = await supabase.rpc("generate_intervention_number");
    
    let baseIntervention = {
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
    };

    // Preload from quote if quoteId provided
    if (quoteId) {
      try {
        const { data: quote, error } = await supabase
          .from("devis")
          .select("*")
          .eq("id", quoteId)
          .single();

        if (!error && quote) {
          baseIntervention = {
            ...baseIntervention,
            titre: quote.title || `Intervention suite au devis ${quote.numero}`,
            client_id: quote.client_id,
            client_nom: quote.client_nom,
            adresse: quote.site_address || quote.property_address || "",
            employe_id: quote.assignee_id || null,
            employe_nom: quote.assignee_id ? (await supabase.from("equipe").select("nom").eq("id", quote.assignee_id).single()).data?.nom || "" : "",
            assigned_employee_ids: quote.assignee_id ? [quote.assignee_id] : [],
            date: quote.planned_date || new Date().toISOString().split("T")[0],
            heure_debut: quote.planned_start_time || "08:00",
            duration_estimated: quote.planned_duration_minutes || 480,
            description: quote.message_client || quote.title || "",
            internal_notes: `Créée depuis le devis ${quote.numero}`,
            quote_id: quoteId,
          };

          toast.success("Informations du devis chargées");
        }
      } catch (error) {
        console.error("Error loading quote:", error);
        toast.error("Erreur lors du chargement du devis");
      }
    }

    setIntervention(baseIntervention);
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
        // Check if date changed for rescheduling reservations and status changed
        const { data: oldIntervention } = await supabase
          .from("jobs")
          .select("date, statut")
          .eq("id", id)
          .single();

        const { error } = await supabase
          .from("jobs")
          .update(intervention)
          .eq("id", id);
        
        if (error) throw error;

        // Reschedule reservations if date changed and intervention is still planned
        if (oldIntervention && 
            oldIntervention.date !== intervention.date && 
            intervention.statut !== "Terminée" &&
            intervention.statut !== "Annulée") {
          await rescheduleInventoryReservations(id!, intervention.date);
        }

        // Auto-consume inventory when status changes to "Terminée"
        if (oldIntervention && 
            oldIntervention.statut !== "Terminée" && 
            intervention.statut === "Terminée") {
          await consumeReservedInventory(
            id!,
            intervention.intervention_number || "INT-" + id
          );
          toast.success("Intervention terminée et stock consommé");
        } else {
          toast.success("Intervention mise à jour");
        }
      } else {
        const { data, error } = await supabase
          .from("jobs")
          .insert([intervention])
          .select()
          .single();
        
        if (error) throw error;

        // Sync consumables from quote if quote_id exists
        if (data && intervention.quote_id) {
          try {
            const result = await syncQuoteConsumablesToIntervention(
              intervention.quote_id,
              data.id
            );
            toast.success(
              `Intervention créée avec ${result.consumablesCount} consommables et ${result.servicesCount} services`
            );
          } catch (syncError) {
            console.error("Error syncing quote items:", syncError);
            toast.warning("Intervention créée mais erreur lors de la copie des articles");
          }
        } else {
          toast.success("Intervention créée");
        }

        // Reserve inventory if intervention is planned
        if (data && intervention.date && intervention.statut !== "Annulée") {
          const { data: consumables } = await supabase
            .from("intervention_consumables")
            .select("inventory_item_id")
            .eq("intervention_id", data.id);

          if (consumables && consumables.length > 0) {
            const itemIds = consumables
              .map(c => c.inventory_item_id)
              .filter(id => id) as string[];
            
            if (itemIds.length > 0) {
              await reserveInventoryForIntervention(
                data.id,
                intervention.intervention_number || data.intervention_number,
                intervention.date,
                itemIds
              );
            }
          }
        }

        navigate(`/interventions/${data.id}/editer`);
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!isEditMode || !intervention) return;
    
    setSaving(true);
    try {
      // Update intervention status
      const { error } = await supabase
        .from("jobs")
        .update({ statut: "Terminée", duration_actual: calculateActualDuration() })
        .eq("id", id);
      
      if (error) throw error;

      // Consume reserved inventory
      await consumeReservedInventory(
        id!,
        intervention.intervention_number || "INT-" + id
      );

      toast.success("Intervention marquée comme terminée et stock mis à jour");
      loadIntervention();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!intervention?.id) {
      toast.error("Veuillez d'abord enregistrer l'intervention");
      return;
    }

    if (intervention.invoice_id) {
      toast.info("Une facture existe déjà pour cette intervention");
      navigate(`/factures/${intervention.invoice_id}`);
      return;
    }

    setSaving(true);
    try {
      const newInvoice = await createInvoiceFromIntervention(intervention.id);
      toast.success("Facture créée avec succès");
      
      // Refresh intervention to get invoice_id
      await loadIntervention();
      
      // Navigate to invoice
      navigate(`/factures/${newInvoice.id}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast.error(error.message || "Erreur lors de la création de la facture");
    } finally {
      setSaving(false);
    }
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
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setDisplayOptionsOpen(true)}
                title="Options d'affichage"
              >
                <Settings className="h-4 w-4" />
              </Button>
              {isEditMode && intervention.statut !== "Terminée" && (
                <>
                  <Button variant="outline" onClick={() => setRecurrenceOpen(true)}>
                    <Repeat className="h-4 w-4 mr-2" />
                    Récurrence
                  </Button>
                  <Button variant="outline" onClick={handleMarkComplete} disabled={saving}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marquer terminée
                  </Button>
                </>
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

      {/* Recurrence Dialog */}
      {isEditMode && (
        <RecurrenceDialog
          open={recurrenceOpen}
          onOpenChange={setRecurrenceOpen}
          interventionId={id!}
          interventionData={intervention}
        />
      )}

      {/* Display Options Panel */}
      <DisplayOptionsPanel
        open={displayOptionsOpen}
        onOpenChange={setDisplayOptionsOpen}
        settings={displaySettings}
        availableColumns={availableSections}
        onToggleColumn={toggleColumn}
        onSaveView={saveView}
        onDeleteView={deleteView}
        onApplyView={applyView}
      />
    </div>
  );
}
