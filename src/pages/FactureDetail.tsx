import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2, Download, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LigneFacture {
  description: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

const FactureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facture, setFacture] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [lignes, setLignes] = useState<LigneFacture[]>([]);

  useEffect(() => {
    if (id) {
      loadFacture();
      loadClients();
    }
  }, [id]);

  const loadFacture = async () => {
    const { data } = await supabase.from("factures").select("*").eq("id", id).single();
    if (data) {
      setFacture(data);
      const parsedLignes = (Array.isArray(data.lignes) ? data.lignes : []) as unknown as LigneFacture[];
      setLignes(parsedLignes);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*");
    setClients(data || []);
  };

  const addLigne = () => {
    setLignes([...lignes, { description: "", quantite: 1, prix_unitaire: 0, total: 0 }]);
  };

  const updateLigne = (index: number, field: keyof LigneFacture, value: any) => {
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
    const remise = facture?.remise || 0;
    const totalApresRemise = totalHT - remise;
    const totalTTC = totalApresRemise * 1.2;
    return { totalHT, totalApresRemise, totalTTC };
  };

  const handleSave = async () => {
    const { totalHT, totalTTC } = calculateTotals();
    const updateData: any = {
      ...facture,
      lignes,
      total_ht: totalHT,
      total_ttc: totalTTC,
    };

    // Set date_paiement when marking as paid
    if (facture.statut === "Payée" && !facture.date_paiement) {
      updateData.date_paiement = new Date().toISOString();
    }

    const { error } = await supabase.from("factures").update(updateData).eq("id", id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Facture mise à jour");
      loadFacture();
    }
  };

  if (!facture) return <div className="p-6">Chargement...</div>;

  const { totalHT, totalApresRemise, totalTTC } = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate("/factures")} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold uppercase tracking-wide">{facture.numero}</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder
          </Button>
          <Button variant="outline" className="glass-card">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="glass-card p-6 col-span-2">
          <h2 className="text-xl font-bold mb-4">Informations générales</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Client</Label>
              <Select value={facture.client_id || ""} onValueChange={(v) => setFacture({ ...facture, client_id: v })}>
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
              <Label>Statut</Label>
              <Select value={facture.statut} onValueChange={(v) => setFacture({ ...facture, statut: v })}>
                <SelectTrigger className="glass-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Payée">Payée</SelectItem>
                  <SelectItem value="En retard">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Échéance</Label>
              <Input
                type="date"
                value={facture.echeance?.split("T")[0] || ""}
                onChange={(e) => setFacture({ ...facture, echeance: e.target.value })}
                className="glass-card"
              />
            </div>
            <div>
              <Label>Date de paiement</Label>
              <Input
                type="date"
                value={facture.date_paiement?.split("T")[0] || ""}
                onChange={(e) => setFacture({ ...facture, date_paiement: e.target.value })}
                className="glass-card"
              />
            </div>
          </div>

          <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
            Lignes de la facture
            <Button onClick={addLigne} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </h3>
          <div className="space-y-3">
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
                <div className="col-span-2 font-semibold">{ligne.total.toFixed(2)} €</div>
                <Button onClick={() => removeLigne(index)} variant="ghost" size="icon" className="col-span-1">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Totaux</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-semibold">{totalHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Remise</span>
              <Input
                type="number"
                value={facture.remise || 0}
                onChange={(e) => setFacture({ ...facture, remise: Number(e.target.value) })}
                className="w-24 glass-card text-right"
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
          <div className="flex gap-2">
            <Button onClick={() => navigate("/factures")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
            <Button
              onClick={async () => {
                const { error } = await supabase
                  .from("factures")
                  .update({ statut: "Payée", date_paiement: new Date().toISOString() })
                  .eq("id", id);
                if (error) toast.error("Erreur");
                else { toast.success("Facture marquée payée"); loadFacture(); }
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Marquer payée
            </Button>
            <Button
              onClick={async () => {
                const { error } = await supabase.from("factures").update({ statut: "En retard" }).eq("id", id);
                if (!error) { toast.success("Facture en retard"); loadFacture(); }
              }}
              variant="destructive"
            >
              En retard
            </Button>
            <Button variant="outline" onClick={() => toast.success("PDF généré (stub)")}>
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
