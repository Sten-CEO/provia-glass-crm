import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, Mail, Plus, Trash2 } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { useGenerateDocumentNumber } from "@/hooks/useDocumentNumbering";
import { PdfPreviewModal } from "@/components/documents/PdfPreviewModal";
import { logInvoiceLink } from "@/lib/interventionLogger";

interface LigneFacture {
  description: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

interface InvoiceState {
  id?: string;
  numero: string;
  client_id: string;
  client_nom: string;
  issue_date: string;
  echeance: string;
  statut: string;
  remise?: number;
  lignes: LigneFacture[];
  total_ht: number;
  total_ttc: number;
  notes_legal?: string;
}

export default function FactureEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const interventionId = searchParams.get("intervention");

  const [clients, setClients] = useState<any[]>([]);
  const { templates, defaultTemplate } = useTemplates("invoice");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const generateNumberMutation = useGenerateDocumentNumber("invoice");
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const [facture, setFacture] = useState<InvoiceState>({
    numero: "",
    client_id: "",
    client_nom: "",
    issue_date: new Date().toISOString().split("T")[0],
    echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    statut: "En attente",
    remise: 0,
    lignes: [],
    total_ht: 0,
    total_ttc: 0,
    notes_legal: "",
  });

  useEffect(() => {
    loadClients();
    if (!isNew && id) loadInvoice(id);
    else if (isNew && interventionId) loadInterventionData(interventionId);
  }, [id, interventionId]);

  useEffect(() => {
    if (!selectedTemplateId && defaultTemplate) setSelectedTemplateId(defaultTemplate.id);
    if (isNew && !facture.numero) {
      generateNumberMutation.mutate(undefined, {
        onSuccess: (num) => setFacture((f) => ({ ...f, numero: num })),
      });
    }
  }, [defaultTemplate]);

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("id, nom, email");
    setClients(data || []);
  };

  const loadInvoice = async (invoiceId: string) => {
    const { data, error } = await supabase.from("factures").select("*").eq("id", invoiceId).single();
    if (error || !data) {
      toast.error("Erreur de chargement");
      navigate("/factures");
      return;
    }
    setFacture({
      id: data.id,
      numero: data.numero,
      client_id: data.client_id || "",
      client_nom: data.client_nom || "",
      issue_date: data.issue_date || new Date().toISOString().split("T")[0],
      echeance: data.echeance || new Date().toISOString().split("T")[0],
      statut: data.statut || "En attente",
      remise: data.remise || 0,
      lignes: Array.isArray(data.lignes) ? (data.lignes as any) : [],
      total_ht: data.total_ht || 0,
      total_ttc: data.total_ttc || 0,
      notes_legal: data.notes_legal || "",
    });
    setSelectedTemplateId(data.template_id || "");
  };

  const loadInterventionData = async (interventionId: string) => {
    // Charger l'intervention avec ses données
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`
        *,
        clients:client_id (nom, email),
        intervention_consumables (
          id, quantity, unit_price, total,
          inventory_item:inventory_item_id (name, unit)
        ),
        intervention_services (
          id, description, quantity, unit_price, total
        )
      `)
      .eq("id", interventionId)
      .single();

    if (jobError || !job) {
      toast.error("Erreur lors du chargement de l'intervention");
      return;
    }

    // Préparer les lignes de facture à partir de l'intervention
    const lignes: LigneFacture[] = [];

    // Ajouter les consommables
    if (job.intervention_consumables && Array.isArray(job.intervention_consumables)) {
      job.intervention_consumables.forEach((consumable: any) => {
        lignes.push({
          description: consumable.inventory_item?.name || "Consommable",
          quantite: consumable.quantity || 1,
          prix_unitaire: consumable.unit_price || 0,
          total: consumable.total || 0,
        });
      });
    }

    // Ajouter les services
    if (job.intervention_services && Array.isArray(job.intervention_services)) {
      job.intervention_services.forEach((service: any) => {
        lignes.push({
          description: service.description || "Service",
          quantite: service.quantity || 1,
          prix_unitaire: service.unit_price || 0,
          total: service.total || 0,
        });
      });
    }

    // Si pas de lignes, ajouter la prestation de base
    if (lignes.length === 0) {
      lignes.push({
        description: job.titre || "Intervention",
        quantite: 1,
        prix_unitaire: 0,
        total: 0,
      });
    }

    // Mettre à jour la facture avec les données de l'intervention
    setFacture((f) => ({
      ...f,
      client_id: job.client_id || "",
      client_nom: job.clients?.nom || "",
      lignes,
      notes_legal: `Intervention du ${new Date(job.date).toLocaleDateString("fr-FR")}\n${job.description || ""}`.trim(),
    }));

    // Marquer l'intervention comme liée à cette facture (après création)
    // On stockera l'ID intervention pour le lier plus tard lors de la sauvegarde
    toast.success("Données de l'intervention chargées");
  };

  const addLigne = () => {
    setFacture((f) => ({
      ...f,
      lignes: [...f.lignes, { description: "", quantite: 1, prix_unitaire: 0, total: 0 }],
    }));
  };

  const updateLigne = (index: number, updates: Partial<LigneFacture>) => {
    setFacture((f) => ({
      ...f,
      lignes: f.lignes.map((l, i) => (i === index ? { ...l, ...updates, total: (updates.quantite ?? l.quantite) * (updates.prix_unitaire ?? l.prix_unitaire) } : l)),
    }));
  };

  const removeLigne = (index: number) => {
    setFacture((f) => ({ ...f, lignes: f.lignes.filter((_, i) => i !== index) }));
  };

  const recomputeTotals = () => {
    const totalHT = facture.lignes.reduce((sum, l) => sum + l.total, 0);
    const afterDiscount = totalHT - (facture.remise || 0);
    const totalVAT = 0.2 * afterDiscount; // par défaut 20% si pas de TVA ligne
    const totalTTC = afterDiscount + totalVAT;
    setFacture((f) => ({ ...f, total_ht: afterDiscount, total_ttc: totalTTC }));
  };

  useEffect(() => {
    recomputeTotals();
  }, [facture.lignes, facture.remise]);

  const handleSave = async () => {
    if (!facture.client_id) {
      toast.error("Sélectionnez un client");
      return;
    }

    const client = clients.find((c) => c.id === facture.client_id);

    const payload: any = {
      numero: facture.numero,
      client_id: facture.client_id,
      client_nom: client?.nom || facture.client_nom,
      lignes: facture.lignes as any,
      total_ht: facture.total_ht,
      total_ttc: facture.total_ttc,
      remise: facture.remise || 0,
      issue_date: facture.issue_date,
      echeance: facture.echeance,
      statut: facture.statut,
      template_id: selectedTemplateId || null,
      montant: String(facture.total_ttc),
    };

    if (isNew) {
      const { data, error } = await supabase.from("factures").insert([payload]).select().single();
      if (error) {
        toast.error("Erreur de création");
        return;
      }
      setFacture((f) => ({ ...f, id: data.id }));

      // Si la facture a été créée à partir d'une intervention, lier l'intervention à la facture
      if (interventionId) {
        const { error: jobError } = await supabase
          .from("jobs")
          .update({ invoice_id: data.id })
          .eq("id", interventionId);

        if (jobError) {
          console.error("Erreur lors de la liaison de l'intervention:", jobError);
        } else {
          // Enregistrer dans l'historique de l'intervention
          await logInvoiceLink(interventionId, data.numero);
        }
      }

      toast.success("Facture créée");
      navigate(`/factures/${data.id}`);
    } else {
      const { error } = await supabase.from("factures").update(payload).eq("id", facture.id);
      if (error) {
        toast.error("Erreur de sauvegarde");
        return;
      }
      toast.success("Facture sauvegardée");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/factures")}> 
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Facture {facture.numero || "(nouvelle)"}</h1>
            <div className="text-sm text-muted-foreground">Statut: {facture.statut}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              if (!selectedTemplateId) {
                toast.error("Veuillez sélectionner un modèle PDF");
                return;
              }
              setPdfPreviewOpen(true);
            }}
          >
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" /> Envoyer
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Modèle PDF</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un modèle" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      {templates.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Aucun modèle disponible. Créez-en un dans Paramètres → Templates.
                        </div>
                      ) : (
                        templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} {t.is_default ? "(par défaut)" : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client *</Label>
                  <Select
                    value={facture.client_id}
                    onValueChange={(v) => {
                      const c = clients.find((x) => x.id === v);
                      setFacture((f) => ({ ...f, client_id: v, client_nom: c?.nom || "" }));
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>N° Facture</Label>
                  <Input value={facture.numero} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Date d'émission</Label>
                  <Input type="date" value={facture.issue_date} onChange={(e) => setFacture((f) => ({ ...f, issue_date: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Échéance</Label>
                  <Input type="date" value={facture.echeance} onChange={(e) => setFacture((f) => ({ ...f, echeance: e.target.value }))} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Lignes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={addLigne}>
                  <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne
                </Button>
              </div>
              {facture.lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    placeholder="Désignation"
                    value={l.description}
                    onChange={(e) => updateLigne(i, { description: e.target.value })}
                    className="col-span-5"
                  />
                  <Input
                    type="number"
                    placeholder="Qté"
                    value={l.quantite}
                    onChange={(e) => updateLigne(i, { quantite: Number(e.target.value) })}
                    className="col-span-2"
                  />
                  <Input
                    type="number"
                    placeholder="PU HT"
                    value={l.prix_unitaire}
                    onChange={(e) => updateLigne(i, { prix_unitaire: Number(e.target.value) })}
                    className="col-span-2"
                  />
                  <div className="col-span-2 text-right font-medium">{(l.quantite * l.prix_unitaire).toFixed(2)} €</div>
                  <Button variant="ghost" size="icon" onClick={() => removeLigne(i)} className="col-span-1">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Notes & mentions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Mentions légales, RIB, conditions de paiement..."
                value={facture.notes_legal}
                onChange={(e) => setFacture((f) => ({ ...f, notes_legal: e.target.value }))}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-3">Totaux</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span className="font-medium">{facture.lignes.reduce((s, l) => s + l.total, 0).toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remise (€)</span>
                <Input type="number" value={facture.remise || 0} onChange={(e) => setFacture((f) => ({ ...f, remise: Number(e.target.value) }))} className="w-28 text-right" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA (par défaut 20%)</span>
                <span className="font-medium">{((facture.lignes.reduce((s, l) => s + l.total, 0) - (facture.remise || 0)) * 0.2).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total TTC</span>
                <span>{facture.total_ttc.toFixed(2)} €</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {pdfPreviewOpen && (
        <PdfPreviewModal
          open={pdfPreviewOpen}
          onOpenChange={setPdfPreviewOpen}
          documentType="INVOICE"
          documentData={facture}
          templateId={selectedTemplateId}
        />
      )}
    </div>
  );
}
