import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Search, AlertTriangle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Item {
  id: string;
  name: string;
  sku: string | null;
  supplier_name: string | null;
  unit_price_ht: number;
  qty_on_hand: number;
  min_qty_alert: number;
  category: string | null;
}

const InventaireConsommables = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Determine type from current route
  const type = location.pathname.includes('/materiels') ? 'materiel' : 'consommable';
  const activeTab = type === 'materiel' ? 'materiels' : 'consommables';
  
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    supplier_name: "",
    unit_price_ht: 0,
    unit_cost_ht: 0,
    tva_rate: 20,
    qty_on_hand: 0,
    min_qty_alert: 0,
    category: "",
    notes: "",
  });

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setItems((data || []) as Item[]);
  };

  useEffect(() => {
    loadItems();

    const channel = supabase
      .channel(`inventory_items_${type}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        loadItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast.error("Le nom est requis");
      return;
    }

    const { error } = await supabase.from("inventory_items").insert([
      {
        type: type,
        name: newItem.name,
        sku: newItem.sku || null,
        supplier_name: newItem.supplier_name || null,
        unit_price_ht: newItem.unit_price_ht,
        unit_cost_ht: newItem.unit_cost_ht,
        tva_rate: newItem.tva_rate,
        qty_on_hand: newItem.qty_on_hand,
        min_qty_alert: newItem.min_qty_alert,
        category: newItem.category || null,
        notes: newItem.notes || null,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success(`${type === 'materiel' ? 'Matériel' : 'Consommable'} créé avec succès`);
    setNewItem({
      name: "",
      sku: "",
      supplier_name: "",
      unit_price_ht: 0,
      unit_cost_ht: 0,
      tva_rate: 20,
      qty_on_hand: 0,
      min_qty_alert: 0,
      category: "",
      notes: "",
    });
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("inventory_items").delete().eq("id", deleteId);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success(`${type === 'materiel' ? 'Matériel' : 'Consommable'} supprimé avec succès`);
    setDeleteId(null);
  };

  const filteredItems = items.filter(item =>
    search === "" || 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
    (item.supplier_name && item.supplier_name.toLowerCase().includes(search.toLowerCase()))
  );

  const emptyMessage = type === 'materiel' 
    ? "Aucun matériel pour le moment…" 
    : "Aucun consommable pour le moment…";
  
  const ctaLabel = type === 'materiel' 
    ? "Nouveau matériel" 
    : "Nouveau consommable";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Persistent tab bar */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10">
          <TabsTrigger 
            value="consommables" 
            onClick={() => navigate("/inventaire/consommables")}
          >
            Consommables
          </TabsTrigger>
          <TabsTrigger 
            value="materiels" 
            onClick={() => navigate("/inventaire/materiels")}
          >
            Matériels
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          {type === 'materiel' ? 'Matériels' : 'Consommables'}
        </h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide">
              <Plus className="mr-2 h-4 w-4" />
              {ctaLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal max-w-2xl">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">{ctaLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom *</Label>
                  <Input
                    placeholder={type === 'materiel' ? "Ordinateur portable" : "Vis M6"}
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    placeholder="VIS-M6-001"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Input
                    placeholder={type === 'materiel' ? "Informatique" : "Quincaillerie"}
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Fournisseur</Label>
                  <Input
                    placeholder="Fournisseur ABC"
                    value={newItem.supplier_name}
                    onChange={(e) => setNewItem({ ...newItem, supplier_name: e.target.value })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Prix achat unitaire HT (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.unit_cost_ht}
                    onChange={(e) => setNewItem({ ...newItem, unit_cost_ht: parseFloat(e.target.value) || 0 })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Prix vente unitaire HT (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.unit_price_ht}
                    onChange={(e) => setNewItem({ ...newItem, unit_price_ht: parseFloat(e.target.value) || 0 })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>TVA (%)</Label>
                  <Input
                    type="number"
                    value={newItem.tva_rate}
                    onChange={(e) => setNewItem({ ...newItem, tva_rate: parseFloat(e.target.value) || 20 })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Quantité en stock</Label>
                  <Input
                    type="number"
                    value={newItem.qty_on_hand}
                    onChange={(e) => setNewItem({ ...newItem, qty_on_hand: parseFloat(e.target.value) || 0 })}
                    className="glass-card"
                  />
                </div>
                <div>
                  <Label>Seuil d'alerte mini</Label>
                  <Input
                    type="number"
                    value={newItem.min_qty_alert}
                    onChange={(e) => setNewItem({ ...newItem, min_qty_alert: parseFloat(e.target.value) || 0 })}
                    className="glass-card"
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Commentaires internes..."
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="glass-card"
                />
              </div>
              <Button onClick={handleAddItem} className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold">
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, SKU, fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Nom</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">SKU</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Fournisseur</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Prix HT</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Quantité</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Seuil</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isLowStock = item.qty_on_hand <= item.min_qty_alert;
                return (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {item.name}
                        {isLowStock && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Stock faible
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{item.sku || "—"}</td>
                    <td className="p-4 text-muted-foreground text-sm">{item.supplier_name || "—"}</td>
                    <td className="p-4 text-muted-foreground">{item.unit_price_ht.toFixed(2)} €</td>
                    <td className="p-4">
                      <Badge variant={isLowStock ? "destructive" : "outline"}>{item.qty_on_hand}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{item.min_qty_alert}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/inventaire/items/${item.id}`)}
                          title="Voir fiche"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(item.id)}
                          title="Supprimer"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventaireConsommables;
