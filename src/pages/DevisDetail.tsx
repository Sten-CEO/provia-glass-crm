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
import { QuoteSendModal } from "@/components/devis/QuoteSendModal";
import { QuoteConversionDialog } from "@/components/devis/QuoteConversionDialog";

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
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadDevis();
      loadClients();
    }
  }, [id]);

  const loadDevis = async () => {
    const { data } = await supabase.from("devis").select("*").eq("id", id).single();
    if (data) {
      setDevis(data);
      const parsedLignes = (Array.isArray(data.lignes) ? data.lignes : []) as unknown as LigneDevis[];
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
      toast.success("Devis mis à jour");
      loadDevis();
    }
  };

  if (!devis) return <div className="p-6">Chargement...</div>;

  const { totalHT, totalApresRemise, totalTTC, acompte } = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate("/devis")} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold uppercase tracking-wide">{devis.numero}</h1>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
          <Save className="mr-2 h-4 w-4" />
          Sauvegarder
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="glass-card p-6 col-span-2">
          <h2 className="text-xl font-bold mb-4">Informations générales</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
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
              <Label>Statut</Label>
              <Select value={devis.statut} onValueChange={(v) => setDevis({ ...devis, statut: v })}>
                <SelectTrigger className="glass-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Brouillon">Brouillon</SelectItem>
                  <SelectItem value="Envoyé">Envoyé</SelectItem>
                  <SelectItem value="Accepté">Accepté</SelectItem>
                  <SelectItem value="Refusé">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendeur</Label>
              <Input
                value={devis.vendeur || ""}
                onChange={(e) => setDevis({ ...devis, vendeur: e.target.value })}
                className="glass-card"
              />
            </div>
            <div>
              <Label>Date d'envoi</Label>
              <Input
                type="date"
                value={devis.date_envoi?.split("T")[0] || ""}
                onChange={(e) => setDevis({ ...devis, date_envoi: e.target.value })}
                className="glass-card"
              />
            </div>
          </div>

          <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
            Lignes du devis
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

          <div className="mt-6">
            <Label>Message au client</Label>
            <Textarea
              value={devis.message_client || ""}
              onChange={(e) => setDevis({ ...devis, message_client: e.target.value })}
              className="glass-card"
              rows={3}
            />
          </div>

          <div className="mt-4">
            <Label>Conditions</Label>
            <Textarea
              value={devis.conditions || ""}
              onChange={(e) => setDevis({ ...devis, conditions: e.target.value })}
              className="glass-card"
              rows={2}
            />
          </div>

          <div className="mt-4">
            <Label>Notes internes</Label>
            <Textarea
              value={devis.notes_internes || ""}
              onChange={(e) => setDevis({ ...devis, notes_internes: e.target.value })}
              className="glass-card"
              rows={2}
            />
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
                value={devis.remise || 0}
                onChange={(e) => setDevis({ ...devis, remise: Number(e.target.value) })}
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
                className="w-24 glass-card text-right"
              />
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Reste à payer</span>
              <span>{(totalTTC - acompte).toFixed(2)} €</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-2 mt-6">
        <Button onClick={() => navigate("/devis")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button
          onClick={async () => {
            await handleSave();
            const { error } = await supabase.from("devis").update({ statut: "Brouillon" }).eq("id", id);
            if (!error) toast.success("Devis en brouillon");
          }}
          variant="outline"
        >
          Mettre en brouillon
        </Button>
        <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90">
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
          Envoyer
        </Button>
        <Button
          onClick={() => setConvertDialogOpen(true)}
          variant="outline"
        >
          <FileText className="h-4 w-4 mr-2" />
          Convertir
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
    </div>
  );
};

export default DevisDetail;
