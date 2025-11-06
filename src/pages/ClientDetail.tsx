import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, FileText, Briefcase, Receipt, Paperclip } from "lucide-react";
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
      "en cours": "bg-yellow-500",
      "attente de réponses": "bg-orange-500",
      "résolues": "bg-green-500",
      "fermé": "bg-gray-500",
      "rejeté": "bg-red-500",
    };
    return colors[statut?.toLowerCase()] || "bg-gray-500";
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
                  value={formData.statut || "Actif"}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  className="w-full p-2 glass-card rounded-md"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Nouveau">Nouveau</option>
                  <option value="En cours">En cours</option>
                  <option value="Attente de réponses">Attente de réponses</option>
                  <option value="Résolues">Résolues</option>
                  <option value="Fermé">Fermé</option>
                  <option value="Rejeté">Rejeté</option>
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
                  <div key={d.id} className="flex items-center justify-between p-3 glass-card rounded-lg hover:bg-primary/5 transition-colors">
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
                  <div key={j.id} className="flex items-center justify-between p-3 glass-card rounded-lg hover:bg-primary/5 transition-colors">
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
                  <div key={f.id} className="flex items-center justify-between p-3 glass-card rounded-lg hover:bg-primary/5 transition-colors">
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
