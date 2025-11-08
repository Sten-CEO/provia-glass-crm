import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Minus, Upload, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const InventaireItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustment, setAdjustment] = useState({ qty: 0, note: "" });

  useEffect(() => {
    if (id) {
      loadItem();
      loadMovements();
    }
  }, [id]);

  const loadItem = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", id)
      .single();
    if (data) setItem(data);
  };

  const loadMovements = async () => {
    const { data } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("item_id", id)
      .order("date", { ascending: false })
      .limit(50);
    if (data) setMovements(data);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("inventory_items")
      .update(item)
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Article mis à jour");
      loadItem();
    }
  };

  const handleAdjustStock = async (type: "in" | "out") => {
    if (!adjustment.qty || adjustment.qty <= 0) {
      toast.error("Quantité invalide");
      return;
    }

    const qty = type === "in" ? adjustment.qty : -adjustment.qty;
    const newQty = (item.qty_on_hand || 0) + qty;

    const { error: moveError } = await supabase.from("inventory_movements").insert({
      item_id: id,
      type,
      source: "manuel",
      date: new Date().toISOString(),
      qty: Math.abs(qty),
      note: adjustment.note,
      status: "done",
    });

    if (moveError) {
      toast.error("Erreur lors du mouvement");
      return;
    }

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ qty_on_hand: newQty })
      .eq("id", id);

    if (updateError) {
      toast.error("Erreur lors de la mise à jour du stock");
      return;
    }

    toast.success(`Stock ${type === "in" ? "ajouté" : "retiré"}`);
    setAdjustDialogOpen(false);
    setAdjustment({ qty: 0, note: "" });
    loadItem();
    loadMovements();
  };

  if (!item) return <div className="p-6">Chargement...</div>;

  const isLowStock = item.min_qty_alert && item.qty_on_hand <= item.min_qty_alert;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide">{item.name}</h1>
            <p className="text-muted-foreground">SKU: {item.sku || "—"}</p>
          </div>
          {isLowStock && (
            <Badge variant="destructive" className="ml-2">
              Stock faible
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAdjustDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Ajuster stock
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="glass-card col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={item.name || ""}
                  onChange={(e) => setItem({ ...item, name: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={item.sku || ""}
                  onChange={(e) => setItem({ ...item, sku: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Input
                  value={item.category || ""}
                  onChange={(e) => setItem({ ...item, category: e.target.value })}
                  className="glass-card"
                  placeholder="Ex: Câbles, Outils..."
                />
              </div>
              <div>
                <Label>Fournisseur</Label>
                <Input
                  value={item.supplier_name || ""}
                  onChange={(e) => setItem({ ...item, supplier_name: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Prix achat unitaire HT (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unit_cost_ht || 0}
                  onChange={(e) => setItem({ ...item, unit_cost_ht: parseFloat(e.target.value) || 0 })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Prix vente unitaire HT (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unit_price_ht || 0}
                  onChange={(e) => setItem({ ...item, unit_price_ht: parseFloat(e.target.value) || 0 })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>TVA (%)</Label>
                <Select
                  value={String(item.tva_rate || 20)}
                  onValueChange={(v) => setItem({ ...item, tva_rate: parseFloat(v) })}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5.5">5.5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seuil d'alerte stock</Label>
                <Input
                  type="number"
                  value={item.min_qty_alert || 0}
                  onChange={(e) => setItem({ ...item, min_qty_alert: parseInt(e.target.value) || 0 })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Emplacement</Label>
                <Input
                  value={item.location || ""}
                  onChange={(e) => setItem({ ...item, location: e.target.value })}
                  className="glass-card"
                  placeholder="Ex: Entrepôt A, Rayon 3"
                />
              </div>
            </div>
            <div>
              <Label>Notes / Commentaires</Label>
              <Textarea
                value={item.notes || ""}
                onChange={(e) => setItem({ ...item, notes: e.target.value })}
                className="glass-card"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">En stock</span>
                <span className="text-3xl font-bold">{item.qty_on_hand || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Réservé</span>
                <span className="font-semibold">{item.qty_reserved || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2">
                <span className="text-muted-foreground">Disponible</span>
                <span className="font-bold text-primary">
                  {(item.qty_on_hand || 0) - (item.qty_reserved || 0)}
                </span>
              </div>
            </div>

            {isLowStock && (
              <div className="glass-card p-3 bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-semibold">⚠️ Stock en dessous du seuil</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seuil: {item.min_qty_alert} | Actuel: {item.qty_on_hand}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Valeurs</p>
              <div className="flex justify-between text-sm">
                <span>Coût unitaire HT</span>
                <span className="font-semibold">{item.unit_cost_ht?.toFixed(2) || 0}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Prix vente HT</span>
                <span className="font-semibold">{item.unit_price_ht?.toFixed(2) || 0}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Prix vente TTC</span>
                <span className="font-semibold">
                  {(
                    (item.unit_price_ht || 0) *
                    (1 + (item.tva_rate || 20) / 100)
                  ).toFixed(2)}
                  €
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                <span>Valeur stock (coût)</span>
                <span className="font-bold">
                  {((item.qty_on_hand || 0) * (item.unit_cost_ht || 0)).toFixed(2)}€
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-right p-3">Quantité</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Aucun mouvement enregistré
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-muted/30">
                      <td className="p-3">
                        {format(new Date(m.date), "PPp", { locale: fr })}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            m.type === "in"
                              ? "default"
                              : m.type === "out"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {m.type === "in"
                            ? "Entrée"
                            : m.type === "out"
                            ? "Sortie"
                            : m.type === "reserve"
                            ? "Réservation"
                            : m.type === "unreserve"
                            ? "Déréservation"
                            : m.type}
                        </Badge>
                      </td>
                      <td className="p-3 capitalize">{m.source}</td>
                      <td className="text-right p-3 font-semibold">
                        {m.type === "out" ? "-" : "+"}
                        {m.qty}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            m.status === "done"
                              ? "default"
                              : m.status === "planned"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {m.status === "done"
                            ? "Fait"
                            : m.status === "planned"
                            ? "Planifié"
                            : "Annulé"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{m.note || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle>Ajuster le stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantité</Label>
              <Input
                type="number"
                min="0"
                value={adjustment.qty}
                onChange={(e) =>
                  setAdjustment({ ...adjustment, qty: parseInt(e.target.value) || 0 })
                }
                className="glass-card"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={adjustment.note}
                onChange={(e) => setAdjustment({ ...adjustment, note: e.target.value })}
                className="glass-card"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAdjustStock("in")}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
              <Button
                onClick={() => handleAdjustStock("out")}
                variant="destructive"
                className="flex-1"
              >
                <Minus className="h-4 w-4 mr-2" />
                Retirer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventaireItemDetail;
