import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2, Send, Mail, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { QuoteSendModal } from "@/components/devis/QuoteSendModal";
import { QuoteConversionDialog } from "@/components/devis/QuoteConversionDialog";
import { PdfPreviewModal } from "@/components/documents/PdfPreviewModal";

interface LigneDevis {
  description: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

const DevisDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [devis, setDevis] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadDevis();
      loadClients();
      loadEmployees();
    }
  }, [id]);

  const loadDevis = async () => {
    const { data } = await supabase.from("devis").select("*").eq("id", id).single();
    if (data) {
      setDevis(data);
      const parsedLignes = (Array.isArray(data.lignes) ? data.lignes : []).map((ligne: any) => ({
        description: ligne.description || "",
        quantite: ligne.quantite || ligne.qty || 0,
        prix_unitaire: ligne.prix_unitaire || ligne.unit_price_ht || 0,
        total: ligne.total || (ligne.quantite || ligne.qty || 0) * (ligne.prix_unitaire || ligne.unit_price_ht || 0)
      })) as LigneDevis[];
      setLignes(parsedLignes);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*");
    setClients(data || []);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from("equipe").select("*");
    setEmployees(data || []);
  };

  const addLigne = () => {
    setLignes([...lignes, { description: "", quantite: 1, prix_unitaire: 0, total: 0 }]);
  };

  const updateLigne = (index: number, field: keyof LigneDevis, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    if (field === "quantite" || field === "prix_unitaire") {
      newLignes[index].total = newLignes[index].quantite * newLignes[index].prix_unitaire;
    }
    setLignes(newLignes);
  };

  const removeLigne = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalHT = lignes.reduce((sum, ligne) => sum + ligne.total, 0);
    const remise = devis?.remise || 0;
    const acompte = devis?.acompte || 0;
    const totalApresRemise = totalHT - remise;
    const totalTTC = totalApresRemise * 1.2; // TVA 20%
    return { totalHT, totalApresRemise, totalTTC, acompte };
  };

  const handleSave = async () => {
    const previousStatus = devis.statut;
    const { totalHT, totalTTC } = calculateTotals();
    const { error } = await supabase
      .from("devis")
      .update({
        ...devis,
        lignes,
        total_ht: totalHT,
        total_ttc: totalTTC,
      })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      // Sync inventory when status changes
      try {
        const { syncQuoteInventoryStatus } = await import("@/lib/quoteInventorySync");
        await syncQuoteInventoryStatus(
          id!,
          devis.numero,
          devis.statut,
          previousStatus,
          lignes
        );
      } catch (invError) {
        console.error("Inventory sync error:", invError);
        toast.error("Erreur lors de la mise à jour du stock");
      }

      // Sync inventory planning for future date
      try {
        const { syncQuoteInventoryPlanning } = await import("@/lib/quoteInventoryPlanning");
        await syncQuoteInventoryPlanning(
          id!,
          devis.numero,
          lignes,
          devis.planned_date
        );
      } catch (planningError) {
        console.error("Error syncing inventory planning:", planningError);
      }
      
      toast.success("Devis mis à jour");
      
      // Auto-créer l'intervention si activé et statut devient Accepté/Signé
      if (devis.auto_create_job_on_accept && 
          (devis.statut === "Accepté" || devis.statut === "Signé") && 
          previousStatus !== "Accepté" && 
          previousStatus !== "Signé") {
        await createJobFromQuote();
      }
      
      // Émettre l'événement si le statut passe à "Accepté"
      if (devis.statut === "Accepté" && previousStatus !== "Accepté") {
        eventBus.emit(EVENTS.QUOTE_ACCEPTED, {
          quoteId: id,
          quoteNumber: devis.numero,
          scheduledDate: devis.expires_at || new Date().toISOString(),
        });
      }
      
      // Émettre l'événement si le statut passe à "Refusé" ou "Annulé"
      if ((devis.statut === "Refusé" || devis.statut === "Annulé") && 
          (previousStatus === "Accepté" || previousStatus === "Envoyé")) {
        eventBus.emit(EVENTS.QUOTE_CANCELED, { quoteId: id });
      }
      
      loadDevis();
    }
  };

  const createJobFromQuote = async () => {
    // Vérifier qu'aucune intervention n'existe déjà
    const { data: existingJob } = await supabase
      .from("jobs")
      .select("id")
      .eq("quote_id", id)
      .neq("statut", "Annulé")
      .single();

    if (existingJob) {
      return;
    }

    const client = clients.find(c => c.id === devis.client_id);
    const employee = employees.find(e => e.id === devis.assignee_id);

    const { data: newJob, error } = await supabase
      .from("jobs")
      .insert({
        titre: `Intervention suite au devis ${devis.numero}`,
        client_id: devis.client_id,
        client_nom: devis.client_nom,
        employe_id: devis.assignee_id,
        employe_nom: employee?.nom || "",
        assigned_employee_ids: devis.assignee_id ? [devis.assignee_id] : [],
        date: devis.planned_date || new Date().toISOString().split("T")[0],
        heure_debut: devis.planned_start_time,
        heure_fin: devis.planned_end_time || null,
        statut: "À faire",
        adresse: devis.site_address || client?.adresse || "",
        description: devis.message_client || devis.title || "",
        notes: `Créée automatiquement depuis le devis ${devis.numero}`,
        quote_id: id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création de l'intervention");
      console.error(error);
    } else {
      // Sync consumables and services from quote to intervention
      if (newJob?.id && id) {
        try {
          const { syncQuoteConsumablesToIntervention } = await import("@/lib/quoteToInterventionSync");
          const result = await syncQuoteConsumablesToIntervention(id, newJob.id);
          toast.success(
            `Intervention créée avec ${result.consumablesCount} consommables et ${result.servicesCount} services`
          );
        } catch (syncError) {
          console.error("Error syncing quote items:", syncError);
          toast.warning("Intervention créée mais erreur lors de la copie des articles");
        }
      } else {
        toast.success(`Intervention créée automatiquement et liée au devis ${devis.numero}`);
      }
      eventBus.emit(EVENTS.DATA_CHANGED, { scope: 'jobs' });
    }
  };

  const handleCreateJob = async () => {
    await handleSave();
    navigate(`/interventions/nouvelle?quoteId=${id}`);
  };

  if (!devis) return <div className="p-6">Chargement...</div>;

  const { totalHT, totalApresRemise, totalTTC, acompte } = calculateTotals();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Clean header with quote number and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate("/devis")} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide">{devis.numero}</h1>
            <p className="text-sm text-muted-foreground">{devis.client_nom}</p>
          </div>
          <Select value={devis.statut} onValueChange={(v) => setDevis({ ...devis, statut: v })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Brouillon">Brouillon</SelectItem>
              <SelectItem value="Envoyé">Envoyé</SelectItem>
              <SelectItem value="Accepté">Accepté</SelectItem>
              <SelectItem value="Refusé">Refusé</SelectItem>
              <SelectItem value="Annulé">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Primary action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleCreateJob} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Créer une intervention
          </Button>
          <Button onClick={handleSave} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
          <Button onClick={() => setPdfPreviewOpen(true)} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Aperçu PDF
          </Button>
          <Button
            onClick={async () => {
              await handleSave();
              setSendModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Mail className="h-4 w-4 mr-2" />
            Envoyer
          </Button>
        </div>
      </div>

      {/* Two-column layout: main content + totals sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content - Left side (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* General Information */}
          <Card className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Informations générales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select value={devis.client_id || ""} onValueChange={(v) => setDevis({ ...devis, client_id: v })}>
                  <SelectTrigger className="glass-card">
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
              <div>
                <Label>Commercial</Label>
                <Input
                  value={devis.vendeur || ""}
                  onChange={(e) => setDevis({ ...devis, vendeur: e.target.value })}
                  className="glass-card"
                  placeholder="Nom du commercial"
                />
              </div>
              <div>
                <Label>Date d'émission</Label>
                <Input
                  type="date"
                  value={devis.issued_at?.split("T")[0] || ""}
                  onChange={(e) => setDevis({ ...devis, issued_at: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Date d'expiration</Label>
                <Input
                  type="date"
                  value={devis.expiry_date?.split("T")[0] || ""}
                  onChange={(e) => setDevis({ ...devis, expiry_date: e.target.value })}
                  className="glass-card"
                />
              </div>
            </div>
          </Card>

          {/* Planning Information */}
          <Card className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Planification d'intervention</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <input
                  type="checkbox"
                  id="auto-create"
                  checked={devis.auto_create_job_on_accept || false}
                  onChange={(e) => setDevis({ ...devis, auto_create_job_on_accept: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="auto-create" className="cursor-pointer flex-1">
                  Créer l'intervention à la validation
                  <span className="block text-xs text-muted-foreground mt-1">
                    Quand ce devis passe en "Accepté/Signé", une intervention sera créée automatiquement
                  </span>
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date d'intervention souhaitée</Label>
                  <Input
                    type="date"
                    value={devis.planned_date || ""}
                    onChange={(e) => setDevis({ ...devis, planned_date: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Heure de début</Label>
                  <Input
                    type="time"
                    value={devis.planned_start_time || ""}
                    onChange={(e) => setDevis({ ...devis, planned_start_time: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Durée estimée (minutes)</Label>
                  <Input
                    type="number"
                    value={devis.planned_duration_minutes || ""}
                    onChange={(e) => setDevis({ ...devis, planned_duration_minutes: parseInt(e.target.value) || null })}
                    className="glass-card"
                    placeholder="120"
                  />
                </div>
                <div>
                  <Label>Technicien assigné</Label>
                  <Select value={devis.assignee_id || ""} onValueChange={(v) => setDevis({ ...devis, assignee_id: v })}>
                    <SelectTrigger className="glass-card">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Lieu d'intervention</Label>
                <Input
                  value={devis.site_address || ""}
                  onChange={(e) => setDevis({ ...devis, site_address: e.target.value })}
                  className="glass-card"
                  placeholder="Adresse du chantier"
                />
              </div>
            </div>
          </Card>

          {/* Quote Lines */}
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold uppercase tracking-wide">Lignes du devis</h2>
              <Button onClick={addLigne} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne
              </Button>
            </div>
            <div className="space-y-2">
              {lignes.map((ligne, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center glass-card p-3 rounded-lg">
                  <Input
                    placeholder="Description"
                    value={ligne.description}
                    onChange={(e) => updateLigne(index, "description", e.target.value)}
                    className="col-span-5 glass-card"
                  />
                  <Input
                    type="number"
                    placeholder="Qté"
                    value={ligne.quantite}
                    onChange={(e) => updateLigne(index, "quantite", Number(e.target.value))}
                    className="col-span-2 glass-card"
                  />
                  <Input
                    type="number"
                    placeholder="Prix unit."
                    value={ligne.prix_unitaire}
                    onChange={(e) => updateLigne(index, "prix_unitaire", Number(e.target.value))}
                    className="col-span-2 glass-card"
                  />
                  <div className="col-span-2 font-semibold text-right">{ligne.total.toFixed(2)} €</div>
                  <Button onClick={() => removeLigne(index)} variant="ghost" size="icon" className="col-span-1">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Additional Info */}
          <Card className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Informations complémentaires</h2>
            <div className="space-y-4">
              <div>
                <Label>Message au client</Label>
                <Textarea
                  value={devis.message_client || ""}
                  onChange={(e) => setDevis({ ...devis, message_client: e.target.value })}
                  className="glass-card"
                  rows={3}
                  placeholder="Message visible sur le devis..."
                />
              </div>
              <div>
                <Label>Conditions</Label>
                <Textarea
                  value={devis.conditions || ""}
                  onChange={(e) => setDevis({ ...devis, conditions: e.target.value })}
                  className="glass-card"
                  rows={2}
                  placeholder="Conditions de paiement, garanties..."
                />
              </div>
              <div>
                <Label>Notes internes</Label>
                <Textarea
                  value={devis.notes_internes || ""}
                  onChange={(e) => setDevis({ ...devis, notes_internes: e.target.value })}
                  className="glass-card"
                  rows={2}
                  placeholder="Notes visibles uniquement en interne..."
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Totals sidebar - Right side (1/3) */}
        <div className="space-y-4">
          <Card className="glass-card p-6 sticky top-4">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Totaux</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-semibold">{totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Remise</span>
                <Input
                  type="number"
                  value={devis.remise || 0}
                  onChange={(e) => setDevis({ ...devis, remise: Number(e.target.value) })}
                  className="w-24 glass-card text-right h-8"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Après remise</span>
                <span className="font-semibold">{totalApresRemise.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA (20%)</span>
                <span className="font-semibold">{(totalApresRemise * 0.2).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-3">
                <span>Total TTC</span>
                <span>{totalTTC.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-3">
                <span className="text-muted-foreground">Acompte</span>
                <Input
                  type="number"
                  value={devis.acompte || 0}
                  onChange={(e) => setDevis({ ...devis, acompte: Number(e.target.value) })}
                  className="w-24 glass-card text-right h-8"
                />
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Reste à payer</span>
                <span>{(totalTTC - acompte).toFixed(2)} €</span>
              </div>
            </div>
          </Card>

          {/* Action buttons card */}
          <Card className="glass-card p-4">
            <div className="space-y-2">
              <Button
                onClick={() => setConvertDialogOpen(true)}
                variant="outline"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Convertir en facture/chantier
              </Button>
              <Button
                onClick={async () => {
                  await handleSave();
                  const { error } = await supabase.from("devis").update({ statut: "Brouillon" }).eq("id", id);
                  if (!error) toast.success("Devis en brouillon");
                }}
                variant="outline"
                className="w-full"
              >
                Mettre en brouillon
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex gap-2 justify-end border-t border-white/10 pt-4">
        <Button onClick={() => navigate("/devis")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button onClick={handleSave} variant="outline">
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
        <Button
          onClick={async () => {
            await handleSave();
            setSendModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90"
        >
          <Mail className="h-4 w-4 mr-2" />
          Envoyer par email
        </Button>
      </div>

      {/* Modals */}
      <QuoteSendModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        quoteId={devis.id}
        quoteNumber={devis.numero}
        clientEmail={clients.find((c) => c.id === devis.client_id)?.email || ""}
        clientName={devis.client_nom}
      />

      <QuoteConversionDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        quoteId={devis.id}
        quoteData={devis}
      />

      <PdfPreviewModal
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        documentType="QUOTE"
        documentData={devis}
        templateId={devis.template_id}
      />
    </div>
  );
};

export default DevisDetail;
