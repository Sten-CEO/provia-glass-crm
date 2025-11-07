import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, FileText, Briefcase, Receipt, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [devis, setDevis] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (id) {
      loadClient();
      loadHistory();
    }
  }, [id]);

  const loadClient = async () => {
    const { data } = await supabase.from("clients").select("*").eq("id", id).single();
    if (data) {
      setClient(data);
      setFormData(data);
    }
  };

  const loadHistory = async () => {
    const { data: devisData } = await supabase.from("devis").select("*").eq("client_id", id);
    const { data: jobsData } = await supabase.from("jobs").select("*").eq("client_id", id);
    const { data: facturesData } = await supabase.from("factures").select("*").eq("client_id", id);
    
    if (devisData) setDevis(devisData);
    if (jobsData) setJobs(jobsData);
    if (facturesData) setFactures(facturesData);
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
          className="glass-card p-3 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate(`/devis?client_id=${id}`)}
        >
          <div className="text-xs text-muted-foreground mb-1">Devis</div>
          <div className="text-lg font-bold">{devis.length}</div>
          {devis.some(d => d.statut === "Accepté") && (
            <Badge variant="outline" className="text-xs mt-1">Accepté</Badge>
          )}
        </Card>

        {/* Factures */}
        <Card 
          className="glass-card p-3 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate(`/factures?client_id=${id}`)}
        >
          <div className="text-xs text-muted-foreground mb-1">Factures</div>
          <div className="text-lg font-bold">
            {factures.filter(f => f.statut !== "Payée").length}/{factures.length}
          </div>
          <div className="text-xs text-muted-foreground">
            {factures.filter(f => f.statut !== "Payée").reduce((sum, f) => sum + (Number(f.total_ttc) || 0), 0).toLocaleString()} € dû
          </div>
        </Card>

        {/* Jobs */}
        <Card 
          className="glass-card p-3 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => navigate(`/jobs?client_id=${id}`)}
        >
          <div className="text-xs text-muted-foreground mb-1">Jobs</div>
          <div className="text-sm">
            {jobs.filter(j => j.statut === "En cours").length} en cours
          </div>
          <div className="text-xs text-muted-foreground">
            {jobs.filter(j => j.statut === "Terminé").length} terminés
          </div>
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

      <Tabs defaultValue="infos">
        <TabsList className="glass-card">
          <TabsTrigger value="infos">Infos générales</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="pieces">Pièces jointes</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <Card className="glass-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
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
                <Label>Téléphone</Label>
                <Input
                  value={formData.telephone || ""}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>TVA</Label>
                <Input
                  value={formData.tva || ""}
                  onChange={(e) => setFormData({ ...formData, tva: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div className="col-span-2">
                <Label>Adresse</Label>
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
                <Label>Statut</Label>
                <select
                  value={formData.statut || "nouveau"}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  className="w-full p-2 glass-card rounded-md"
                >
                  <option value="nouveau">Nouveau</option>
                  <option value="en_cours">En cours</option>
                  <option value="attente">Attente</option>
                  <option value="resolues">Résolues</option>
                  <option value="ferme">Fermé</option>
                  <option value="rejete">Rejeté</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label>Demande</Label>
                <Textarea
                  value={formData.demande || ""}
                  onChange={(e) => setFormData({ ...formData, demande: e.target.value })}
                  className="glass-card"
                  rows={3}
                  placeholder="Description de la demande du client..."
                />
              </div>
              <div>
                <Label>Date début</Label>
                <Input
                  type="date"
                  value={formData.debut || ""}
                  onChange={(e) => setFormData({ ...formData, debut: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={formData.fin || ""}
                  onChange={(e) => setFormData({ ...formData, fin: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(formData.tags || []).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => 
                          setFormData({ 
                            ...formData, 
                            tags: (formData.tags || []).filter((_: any, idx: number) => idx !== i) 
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        setFormData({ 
                          ...formData, 
                          tags: [...(formData.tags || []), tagInput.trim()] 
                        });
                        setTagInput("");
                      }
                    }}
                    placeholder="Ajouter un tag..."
                    className="glass-card"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setFormData({ 
                          ...formData, 
                          tags: [...(formData.tags || []), tagInput.trim()] 
                        });
                        setTagInput("");
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="glass-card"
                  rows={3}
                />
              </div>
            </div>
          </Card>
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
    </div>
  );
};

export default ClientDetail;
