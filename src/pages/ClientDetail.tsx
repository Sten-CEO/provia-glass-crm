import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, FileText, Briefcase, Receipt, Paperclip, X, Menu, Settings, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { SubFunctionsDrawer } from "@/components/layout/SubFunctionsDrawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickCreateDialog } from "@/components/clients/QuickCreateDialog";
import { ContractUploadSection } from "@/components/clients/ContractUploadSection";
import { SecondaryAddressesSection } from "@/components/clients/SecondaryAddressesSection";
import { ClientPlanningSection } from "@/components/clients/ClientPlanningSection";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

const subFunctions = [
  { label: "Contrats", path: "/clients?filter=contrats" },
  { label: "Adresses", path: "/clients?filter=adresses" },
  { label: "Contacts", path: "/clients?filter=contacts" },
  { label: "Interventions", path: "/interventions" },
  { label: "Devis", path: "/devis" },
  { label: "Factures", path: "/factures" },
];

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const { companyId } = useCurrentCompany();
  const [client, setClient] = useState<any>(null);
  const [devis, setDevis] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [tagInput, setTagInput] = useState("");
  const [subFunctionsOpen, setSubFunctionsOpen] = useState(false);
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("pv_client_display_prefs");
    return saved ? JSON.parse(saved) : {
      telephone_mobile: true,
      entreprise: true,
      siret: true,
      tva_intra: true,
      taux_horaire: true,
      indice_confiance: true,
      provenance: true,
      secteur: true,
      commentaires: true,
    };
  });
  const [customFields, setCustomFields] = useState<Array<{ key: string; type: string; value?: any }>>([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<"devis" | "intervention" | "facture">("devis");

  useEffect(() => {
    localStorage.setItem("pv_client_display_prefs", JSON.stringify(visibleFields));
  }, [visibleFields]);

  const toggleField = (field: string) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const addCustomField = () => {
    const key = prompt("Nom du champ personnalisé:");
    const type = prompt("Type (texte/nombre/case):", "texte");
    if (key && type) {
      setCustomFields(prev => [...prev, { key, type }]);
    }
  };

  useEffect(() => {
    if (id && companyId) {
      loadClient();
      loadHistory();
    }
  }, [id, companyId]);

  const loadClient = async () => {
    if (!companyId) return;

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)  // Security: filter by company
      .single();

    if (error) {
      console.error("Error loading client:", error);
      toast.error("Client introuvable ou accès non autorisé");
      navigate("/clients");
      return;
    }

    if (data) {
      setClient(data);
      setFormData(data);
    }
  };

  const loadHistory = async () => {
    if (!companyId) return;

    const [devisRes, jobsRes, facturesRes] = await Promise.all([
      supabase.from("devis").select("*").eq("client_id", id).eq("company_id", companyId),
      supabase.from("jobs").select("*").eq("client_id", id).eq("company_id", companyId),
      supabase.from("factures").select("*").eq("client_id", id).eq("company_id", companyId),
    ]);

    if (devisRes.data) setDevis(devisRes.data);
    if (jobsRes.data) setJobs(jobsRes.data);
    if (facturesRes.data) setFactures(facturesRes.data);
  };

  const handleSave = async () => {
    const { error } = await supabase.from("clients").update(formData).eq("id", id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Client mis à jour");
      loadClient();
    }
  };

  const getStatutColor = (statut: string) => {
    const colors: any = {
      nouveau: "bg-blue-500",
      en_cours: "bg-green-500",
      attente: "bg-yellow-500",
      resolues: "bg-green-600",
      ferme: "bg-gray-500",
      rejete: "bg-red-500",
    };
    return colors[statut?.toLowerCase()] || "bg-gray-500";
  };

  const getStatutBadge = (statut: string | null) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      nouveau: { color: "text-[#3B82F6] border-[#3B82F6]/30 bg-[rgba(59,130,246,0.08)]", label: "Nouveau" },
      en_cours: { color: "text-[#22C55E] border-[#22C55E]/30 bg-[rgba(34,197,94,0.08)]", label: "En cours" },
      attente: { color: "text-[#F59E0B] border-[#F59E0B]/30 bg-[rgba(245,158,11,0.08)]", label: "Attente" },
      resolues: { color: "text-[#10B981] border-[#10B981]/30 bg-[rgba(16,185,129,0.08)]", label: "Résolues" },
      ferme: { color: "text-[#6B7280] border-[#6B7280]/30 bg-[rgba(107,114,128,0.08)]", label: "Fermé" },
      rejete: { color: "text-[#EF4444] border-[#EF4444]/30 bg-[rgba(239,68,68,0.08)]", label: "Rejeté" },
    };
    return statusMap[statut || "nouveau"] || statusMap.nouveau;
  };

  if (!client) return <div className="p-6">Chargement...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate("/clients")} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide">{client.nom}</h1>
            <p className="text-muted-foreground">{client.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSubFunctionsOpen(true)}
            title="Sous-fonctions"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
          <Save className="mr-2 h-4 w-4" />
          Sauvegarder
        </Button>
      </div>

      {/* Recap Strip */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        {/* Suivi chantier */}
        <Card className="glass-card p-3">
          <div className="text-xs text-muted-foreground mb-1">Suivi chantier</div>
          <div className="flex items-center gap-2">
            {(() => {
              const badge = getStatutBadge(client.statut);
              return (
                <span 
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}
                  title={client.demande?.slice(0, 120) || "Aucune demande"}
                >
                  {badge.label}
                </span>
              );
            })()}
          </div>
          {(client.debut || client.fin) && (
            <div className="text-xs text-muted-foreground mt-1">
              {client.debut && new Date(client.debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              {client.debut && client.fin && " → "}
              {client.fin && new Date(client.fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
            </div>
          )}
        </Card>

        {/* Devis */}
        <Card 
          className="glass-card p-3 cursor-pointer hover:bg-primary/5 transition-colors relative group"
          onClick={() => navigate(`/devis?client_id=${id}`)}
        >
          <div className="text-xs text-muted-foreground mb-1">Devis</div>
          <div className="text-lg font-bold">{devis.length}</div>
          {devis.some(d => d.statut === "Accepté") && (
            <Badge variant="outline" className="text-xs mt-1">Accepté</Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setQuickCreateType("devis");
              setQuickCreateOpen(true);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </Card>

        {/* Factures */}
        <Card 
          className="glass-card p-3 cursor-pointer hover:bg-primary/5 transition-colors relative group"
          onClick={() => navigate(`/factures?client_id=${id}`)}
        >
          <div className="text-xs text-muted-foreground mb-1">Factures</div>
          <div className="text-lg font-bold">
            {factures.filter(f => f.statut !== "Payée").length}/{factures.length}
          </div>
          <div className="text-xs text-muted-foreground">
            {factures.filter(f => f.statut !== "Payée").reduce((sum, f) => sum + (Number(f.total_ttc) || 0), 0).toLocaleString()} € dû
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setQuickCreateType("facture");
              setQuickCreateOpen(true);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </Card>

        {/* Interventions */}
        <Card 
          className="glass-card p-3 cursor-pointer hover:bg-primary/5 transition-colors relative group"
          onClick={() => navigate(`/interventions?client_id=${id}`)}
        >
          <div className="text-xs text-muted-foreground mb-1">Interventions</div>
          <div className="text-sm">
            {jobs.filter(j => j.statut === "En cours").length} en cours
          </div>
          <div className="text-xs text-muted-foreground">
            {jobs.filter(j => j.statut === "Terminé").length} terminés
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setQuickCreateType("intervention");
              setQuickCreateOpen(true);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </Card>

        {/* Planning */}
        <Card 
          className="glass-card p-3 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate(`/planning?client_id=${id}`)}
        >
          <div className="text-xs text-muted-foreground mb-1">Planning</div>
          {(() => {
            const futureJobs = jobs.filter(j => new Date(j.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return futureJobs.length > 0 ? (
              <>
                <div className="text-sm font-medium">
                  {new Date(futureJobs[0].date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </div>
                <div className="text-xs text-muted-foreground">{futureJobs[0].employe_nom || "—"}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            );
          })()}
        </Card>
      </div>

      <Tabs defaultValue={tabFromUrl || "donnees"}>
        <TabsList className="glass-card">
          <TabsTrigger value="donnees">Données</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="facturation">Facturation</TabsTrigger>
          <TabsTrigger value="contrat">Contrat</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="donnees">
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setDisplayOptionsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Options d'affichage
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Contact */}
            <Card className="glass-card p-6">
              <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prénom / Nom</Label>
                  <Input
                    value={formData.nom || ""}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Téléphone fixe</Label>
                  <Input
                    value={formData.telephone || ""}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="glass-card"
                  />
                </div>
                {visibleFields.telephone_mobile && (
                  <div>
                    <Label>Téléphone mobile</Label>
                    <Input
                      value={formData.telephone || ""}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Entreprise */}
            {visibleFields.entreprise && (
              <Card className="glass-card p-6">
                <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Entreprise</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="is_company" />
                    <Label htmlFor="is_company">Il s'agit d'une entreprise</Label>
                  </div>
                  <div>
                    <Label>Nom de la société</Label>
                    <Input
                      value={formData.nom || ""}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label>N° TVA</Label>
                    <Input
                      value={formData.tva || ""}
                      onChange={(e) => setFormData({ ...formData, tva: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Contrat global */}
            {visibleFields.taux_horaire && (
              <Card className="glass-card p-6">
                <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Contrat global</h3>
                <div>
                  <Label>Taux horaire par défaut (€)</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    className="glass-card"
                  />
                </div>
              </Card>
            )}

            {/* Chiffres clés */}
            <Card className="glass-card p-6">
              <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Chiffres clés</h3>
              <div className="grid grid-cols-2 gap-4">
                {visibleFields.indice_confiance && (
                  <div>
                    <Label>Indice de confiance</Label>
                    <Select>
                      <SelectTrigger className="glass-card">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faible">Faible</SelectItem>
                        <SelectItem value="moyen">Moyen</SelectItem>
                        <SelectItem value="eleve">Élevé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Reste à payer total</Label>
                  <Input
                    value={`${factures.filter(f => f.statut !== "Payée").reduce((sum, f) => sum + (Number(f.total_ttc) || 0), 0).toLocaleString()} €`}
                    disabled
                    className="glass-card"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">Ajouter une adresse</Button>
                <Button variant="outline" size="sm">Ajouter une intervention</Button>
                <Button variant="outline" size="sm">Demande d'intervention</Button>
              </div>
            </Card>

            {/* Divers */}
            <Card className="glass-card p-6">
              <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Divers</h3>
              <div className="grid grid-cols-2 gap-4">
                {visibleFields.provenance && (
                  <div>
                    <Label>Provenance</Label>
                    <Input
                      placeholder="Référencement, Bouche-à-oreille..."
                      className="glass-card"
                    />
                  </div>
                )}
                {visibleFields.secteur && (
                  <div>
                    <Label>Secteur</Label>
                    <Input
                      placeholder="Résidentiel, Tertiaire..."
                      className="glass-card"
                    />
                  </div>
                )}
              </div>
              {visibleFields.commentaires && (
                <div className="mt-4">
                  <Label>Commentaires internes</Label>
                  <Textarea
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="glass-card"
                    rows={4}
                  />
                </div>
              )}
            </Card>

            {/* Adresse principale */}
            <Card className="glass-card p-6">
              <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Adresse principale</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rue</Label>
                  <Input
                    value={formData.adresse || ""}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input
                    value={formData.ville || ""}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input
                    placeholder="75000"
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Étage / Appartement / Codes</Label>
                  <Input
                    placeholder="Étage 3, Appt 12, Code A1234"
                    className="glass-card"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm">📍 Itinéraire</Button>
              </div>
            </Card>

            {/* Adresses secondaires */}
            {id && (
              <Card className="glass-card p-6">
                <SecondaryAddressesSection clientId={id} />
              </Card>
            )}

            {/* Custom fields */}
            {formData.custom_fields && formData.custom_fields.length > 0 && (
              <Card className="glass-card p-6">
                <h3 className="font-semibold mb-4 uppercase tracking-wide text-sm">Champs personnalisés</h3>
                <div className="space-y-2">
                  {formData.custom_fields.map((field: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{field.label || field.key}</Label>
                        <Input value={field.value} className="glass-card" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="devis">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Devis du client</h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setQuickCreateType("devis");
                    setQuickCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Button>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/devis/new?client_id=${id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir en version avancée
                </Button>
              </div>
            </div>
            {devis.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aucun devis pour ce client</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devis.map(d => (
                  <div key={d.id} className="flex justify-between items-center p-3 glass-card rounded hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/devis/${d.id}`)}>
                    <div>
                      <span className="font-medium">{d.numero}</span>
                      <p className="text-sm text-muted-foreground">{d.montant} €</p>
                    </div>
                    <Badge>{d.statut}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Interventions du client</h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setQuickCreateType("intervention");
                    setQuickCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Button>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/interventions/nouvelle?client_id=${id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir en version avancée
                </Button>
              </div>
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aucune intervention pour ce client</p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map(j => (
                  <div key={j.id} className="flex justify-between items-center p-3 glass-card rounded hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/interventions/${j.id}/report`)}>
                    <div>
                      <span className="font-medium">{j.titre}</span>
                      <p className="text-sm text-muted-foreground">{j.date} · {j.employe_nom}</p>
                    </div>
                    <Badge>{j.statut}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="facturation">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Factures du client</h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setQuickCreateType("facture");
                    setQuickCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Button>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/factures/new?client_id=${id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir en version avancée
                </Button>
              </div>
            </div>
            {factures.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aucune facture pour ce client</p>
              </div>
            ) : (
              <div className="space-y-2">
                {factures.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-3 glass-card rounded hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/factures/${f.id}`)}>
                    <div>
                      <span className="font-medium">{f.numero}</span>
                      <p className="text-sm text-muted-foreground">{f.montant} €</p>
                    </div>
                    <Badge>{f.statut}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contrat">
          <div className="space-y-6">
            {id && <ContractUploadSection clientId={id} />}
          </div>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="glass-card p-6">
            <h3 className="font-semibold mb-4">Informations de contact</h3>
            <p className="text-muted-foreground text-center py-8">
              Voir l'onglet "Données" pour les informations de contact
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <div className="space-y-6">
            {id && <ClientPlanningSection clientId={id} />}
          </div>
        </TabsContent>

        <TabsContent value="historique" className="space-y-4">
          <Card className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" /> Devis ({devis.length})
            </h3>
            <div className="space-y-2">
              {devis.length > 0 ? (
                devis.map((d) => (
                  <div 
                    key={d.id} 
                    className="flex items-center justify-between p-3 glass-card rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/devis/${d.id}`)}
                  >
                    <div>
                      <p className="font-semibold">{d.numero}</p>
                      <p className="text-sm text-muted-foreground">{d.montant} €</p>
                    </div>
                    <Badge className={getStatutColor(d.statut)}>{d.statut}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun devis</p>
              )}
            </div>
          </Card>

          <Card className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Jobs ({jobs.length})
            </h3>
            <div className="space-y-2">
              {jobs.length > 0 ? (
                jobs.map((j) => (
                  <div 
                    key={j.id} 
                    className="flex items-center justify-between p-3 glass-card rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/jobs/${j.id}`)}
                  >
                    <div>
                      <p className="font-semibold">{j.titre}</p>
                      <p className="text-sm text-muted-foreground">{j.date} · {j.employe_nom}</p>
                    </div>
                    <Badge>{j.statut}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun job</p>
              )}
            </div>
          </Card>

          <Card className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Factures ({factures.length})
            </h3>
            <div className="space-y-2">
              {factures.length > 0 ? (
                factures.map((f) => (
                  <div 
                    key={f.id} 
                    className="flex items-center justify-between p-3 glass-card rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/factures/${f.id}`)}
                  >
                    <div>
                      <p className="font-semibold">{f.numero}</p>
                      <p className="text-sm text-muted-foreground">{f.montant} €</p>
                    </div>
                    <Badge>{f.statut}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucune facture</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pieces">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Paperclip className="h-5 w-5" /> Pièces jointes
              </h3>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Paperclip className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
            <p className="text-muted-foreground text-center py-8">
              Fonctionnalité d'upload disponible en production (Lovable Cloud Storage)
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Display Options Dialog */}
      <Dialog open={displayOptionsOpen} onOpenChange={setDisplayOptionsOpen}>
        <DialogContent className="glass-modal max-w-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Options d'affichage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Personnalisez les champs affichés dans la fiche client
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_telephone_mobile" 
                  checked={visibleFields.telephone_mobile} 
                  onCheckedChange={() => toggleField("telephone_mobile")}
                />
                <Label htmlFor="field_telephone_mobile" className="cursor-pointer">
                  Téléphone mobile
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_entreprise" 
                  checked={visibleFields.entreprise} 
                  onCheckedChange={() => toggleField("entreprise")}
                />
                <Label htmlFor="field_entreprise" className="cursor-pointer">
                  Bloc Entreprise (Société, TVA, SIRET)
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_siret" 
                  checked={visibleFields.siret} 
                  onCheckedChange={() => toggleField("siret")}
                />
                <Label htmlFor="field_siret" className="cursor-pointer">
                  SIRET
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_tva_intra" 
                  checked={visibleFields.tva_intra} 
                  onCheckedChange={() => toggleField("tva_intra")}
                />
                <Label htmlFor="field_tva_intra" className="cursor-pointer">
                  TVA Intracommunautaire
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_taux_horaire" 
                  checked={visibleFields.taux_horaire} 
                  onCheckedChange={() => toggleField("taux_horaire")}
                />
                <Label htmlFor="field_taux_horaire" className="cursor-pointer">
                  Taux horaire par défaut
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_indice_confiance" 
                  checked={visibleFields.indice_confiance} 
                  onCheckedChange={() => toggleField("indice_confiance")}
                />
                <Label htmlFor="field_indice_confiance" className="cursor-pointer">
                  Indice de confiance
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_provenance" 
                  checked={visibleFields.provenance} 
                  onCheckedChange={() => toggleField("provenance")}
                />
                <Label htmlFor="field_provenance" className="cursor-pointer">
                  Provenance (Comment nous a-t-il trouvé)
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_secteur" 
                  checked={visibleFields.secteur} 
                  onCheckedChange={() => toggleField("secteur")}
                />
                <Label htmlFor="field_secteur" className="cursor-pointer">
                  Secteur d'activité
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox 
                  id="field_commentaires" 
                  checked={visibleFields.commentaires} 
                  onCheckedChange={() => toggleField("commentaires")}
                />
                <Label htmlFor="field_commentaires" className="cursor-pointer">
                  Commentaires / Notes internes
                </Label>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold mb-3">Champs personnalisés</h4>
              {customFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Checkbox id={`custom_${idx}`} defaultChecked />
                  <Label htmlFor={`custom_${idx}`} className="flex-1">{field.key} ({field.type})</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setCustomFields(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCustomField} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un champ personnalisé
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Create Dialog */}
      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        type={quickCreateType}
        clientId={id || ""}
        clientName={client.nom}
        clientData={{
          email: client.email,
          telephone: client.telephone,
          adresse: client.adresse,
          ville: client.ville,
        }}
      />

      <SubFunctionsDrawer
        open={subFunctionsOpen}
        onOpenChange={setSubFunctionsOpen}
        title="Clients"
        subFunctions={subFunctions}
      />

      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        type={quickCreateType}
        clientId={id || ""}
        clientName={client?.nom || ""}
      />
    </div>
  );
};

export default ClientDetail;
