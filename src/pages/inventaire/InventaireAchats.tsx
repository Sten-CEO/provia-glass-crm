import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, Edit, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface PurchaseOrder {
  id: string;
  number: string;
  supplier: string;
  created_at: string;
  expected_date: string | null;
  status: string;
  items: OrderItem[];
  delivery_location?: string;
  note?: string;
  kind: "consommable" | "materiel";
}

interface OrderItem {
  type: "consommable" | "materiel";
  item_id?: string;
  sku: string;
  name: string;
  unit_price_ht: number;
  tva_rate: number;
  qty_ordered: number;
  qty_received: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  type: string;
  unit_price_ht: number;
}

const InventaireAchats = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  const [formData, setFormData] = useState({
    number: "",
    supplier: "",
    created_at: new Date().toISOString().split("T")[0],
    expected_date: "",
    delivery_location: "Dépôt principal",
    status: "en_attente" as const,
    kind: "consommable" as "consommable" | "materiel",
    note: "",
    items: [] as OrderItem[],
  });

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setOrders(data as any || []);
  };

  const loadInventory = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, sku, type, unit_price_ht")
      .order("name");

    if (error) {
      toast.error("Erreur chargement inventaire");
      return;
    }

    setInventoryItems(data || []);
  };

  useEffect(() => {
    loadOrders();
    loadInventory();

    const channel = supabase
      .channel("purchase_orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateOrderNumber = () => {
    const year = new Date().getFullYear();
    const seq = String(orders.length + 1).padStart(3, "0");
    return `CMD-${year}-${seq}`;
  };

  const handleOpenDialog = (order?: any) => {
    if (order?.id) {
      navigate(`/inventaire/achats/${order.id}`);
    } else {
      navigate(`/inventaire/achats/nouveau`);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          type: formData.kind,
          sku: "",
          name: "",
          unit_price_ht: 0,
          tva_rate: 20,
          qty_ordered: 1,
          qty_received: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const selectInventoryItem = (index: number, itemId: string) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    if (item) {
      updateItem(index, "item_id", item.id);
      updateItem(index, "sku", item.sku || "");
      updateItem(index, "name", item.name);
      updateItem(index, "unit_price_ht", item.unit_price_ht || 0);
    }
  };

  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;

    formData.items.forEach((item) => {
      const lineHT = item.unit_price_ht * item.qty_ordered;
      totalHT += lineHT;
      totalTVA += (lineHT * item.tva_rate) / 100;
    });

    return {
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
    };
  };

  const createMovements = async (orderId: string, orderNumber: string, items: OrderItem[]) => {
    const movements = items
      .filter((item) => item.qty_received > 0 && item.item_id)
      .map((item) => ({
        item_id: item.item_id,
        type: "in",
        source: "achat",
        qty: item.qty_received,
        date: new Date().toISOString(),
        ref_id: orderId,
        ref_number: orderNumber,
        note: `Réception commande ${orderNumber}`,
        status: "done",
      }));

    if (movements.length === 0) return;

    const { error } = await supabase.from("inventory_movements").insert(movements);

    if (error) {
      console.error("Erreur création mouvements:", error);
      toast.error("Erreur lors de la création des mouvements");
      return;
    }

    // Update stock quantities
    for (const item of items.filter((i) => i.qty_received > 0 && i.item_id)) {
      const { data: currentItem } = await supabase
        .from("inventory_items")
        .select("qty_on_hand")
        .eq("id", item.item_id)
        .single();

      if (currentItem) {
        await supabase
          .from("inventory_items")
          .update({ qty_on_hand: currentItem.qty_on_hand + item.qty_received })
          .eq("id", item.item_id);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.supplier) {
      toast.error("Le fournisseur est requis");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Ajoutez au moins un article");
      return;
    }

    // Check if number already exists (except for current order)
    const { data: existing } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("number", formData.number)
      .neq("id", editingOrder?.id || "");

    if (existing && existing.length > 0) {
      toast.error("Ce numéro de commande existe déjà");
      return;
    }

    const orderData = {
      number: formData.number,
      supplier: formData.supplier,
      expected_date: formData.expected_date || null,
      status: formData.status,
      kind: formData.kind,
      note: formData.note,
      items: formData.items as any,
      delivery_location: formData.delivery_location,
    };

    if (editingOrder) {
      const { error } = await supabase
        .from("purchase_orders")
        .update(orderData)
        .eq("id", editingOrder.id);

      if (error) {
        toast.error("Échec de mise à jour");
        return;
      }

      // Handle movements if status changed to reçue or partielle
      const prevStatus = editingOrder.status as string;
      const currStatus = formData.status as string;
      if (
        (currStatus === "reçue" || currStatus === "partielle") &&
        prevStatus === "en_attente"
      ) {
        await createMovements(editingOrder.id, formData.number, formData.items);
      }

      toast.success("Commande mise à jour");
    } else {
      const { data: newOrder, error } = await supabase
        .from("purchase_orders")
        .insert([orderData])
        .select()
        .single();

      if (error) {
        toast.error("Échec de création");
        return;
      }

      // Create movements if status is reçue or partielle
      const currentStatus = formData.status as string;
      if (newOrder && (currentStatus === "reçue" || currentStatus === "partielle")) {
        await createMovements(newOrder.id, formData.number, formData.items);
      }

      toast.success("Commande créée avec succès");
    }

    setOpen(false);
    setEditingOrder(null);
  };

  const handleMarkReceived = async () => {
    if (!editingOrder) return;

    // Auto-fill qty_received = qty_ordered for all items
    const updatedItems = formData.items.map((item) => ({
      ...item,
      qty_received: item.qty_ordered,
    }));

    const { error } = await supabase
      .from("purchase_orders")
      .update({
        status: "reçue",
        items: updatedItems as any,
      })
      .eq("id", editingOrder.id);

    if (error) {
      toast.error("Échec de mise à jour");
      return;
    }

    await createMovements(editingOrder.id, formData.number, updatedItems);

    toast.success("Commande marquée reçue et stock mis à jour");
    setOpen(false);
    setEditingOrder(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const order = orders.find((o) => o.id === deleteId);
    if (!order) return;

    if (order.status === "reçue" || order.status === "partielle") {
      toast.error(
        "Impossible de supprimer une commande reçue ou partielle. Annulez-la d'abord."
      );
      setDeleteId(null);
      return;
    }

    const { error } = await supabase.from("purchase_orders").delete().eq("id", deleteId);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Commande supprimée");
    setDeleteId(null);
  };

  const getStatusVariant = (status: string) => {
    if (status === "reçue") return "default";
    if (status === "en_attente") return "secondary";
    if (status === "partielle") return "outline";
    if (status === "annulée") return "destructive";
    return "outline";
  };

  const getStatusLabel = (status: string) => {
    if (status === "en_attente") return "En attente";
    if (status === "partielle") return "Partielle";
    if (status === "reçue") return "Reçue";
    if (status === "annulée") return "Annulée";
    return status;
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.supplier.toLowerCase().includes(search.toLowerCase()) ||
      o.number.toLowerCase().includes(search.toLowerCase())
  );

  const totals = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Achats</h1>

        <Button
          onClick={() => handleOpenDialog()}
          className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Commande
        </Button>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par fournisseur ou référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold uppercase tracking-wide text-sm">
                Fournisseur
              </TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-sm">
                Référence
              </TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-sm">Date</TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-sm">
                Statut
              </TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-sm text-right">
                Montant TTC
              </TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-sm">Lieu</TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-sm">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
              const items = order.items || [];
              const orderTotal = items.reduce((sum, item) => {
                const ht = item.unit_price_ht * item.qty_ordered;
                const tva = (ht * item.tva_rate) / 100;
                return sum + ht + tva;
              }, 0);

              return (
                <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{order.supplier}</TableCell>
                  <TableCell>{order.number}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)} className="rounded-xl">
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {orderTotal.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(order as any).delivery_location || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewOrder(order)}
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(order)}
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(order.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-modal max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">
              {editingOrder ? "Modifier Commande" : "Nouvelle Commande"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Référence *</Label>
                <Input
                  placeholder="CMD-2025-001"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Fournisseur *</Label>
                <Input
                  placeholder="Nom du fournisseur"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Date commande</Label>
                <Input
                  type="date"
                  value={formData.created_at}
                  onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Date livraison prévue</Label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Lieu de livraison</Label>
                <Input
                  placeholder="Dépôt principal"
                  value={formData.delivery_location}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_location: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: any) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="partielle">Partielle</SelectItem>
                    <SelectItem value="reçue">Reçue</SelectItem>
                    <SelectItem value="annulée">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base">Articles</Label>
                <Button onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </div>

              <div className="border border-border/50 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Article</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">PU HT</TableHead>
                      <TableHead className="text-xs">TVA %</TableHead>
                      <TableHead className="text-xs">Qté cmd</TableHead>
                      {(formData.status as string) === "partielle" || (formData.status as string) === "reçue" ? (
                        <TableHead className="text-xs">Qté reçue</TableHead>
                      ) : null}
                      <TableHead className="text-xs text-right">Total HT</TableHead>
                      <TableHead className="text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => {
                      const lineTotal = item.unit_price_ht * item.qty_ordered;
                      const filteredItems = inventoryItems.filter(
                        (i) => i.type === item.type
                      );

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.type}
                              onValueChange={(v: any) => updateItem(index, "type", v)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="consommable">Consommable</SelectItem>
                                <SelectItem value="materiel">Matériel</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.item_id || ""}
                              onValueChange={(v) => selectInventoryItem(index, v)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredItems.map((invItem) => (
                                  <SelectItem key={invItem.id} value={invItem.id}>
                                    {invItem.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.sku}
                              onChange={(e) => updateItem(index, "sku", e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unit_price_ht}
                              onChange={(e) =>
                                updateItem(index, "unit_price_ht", parseFloat(e.target.value) || 0)
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={item.tva_rate}
                              onChange={(e) =>
                                updateItem(index, "tva_rate", parseFloat(e.target.value) || 0)
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              value={item.qty_ordered}
                              onChange={(e) =>
                                updateItem(index, "qty_ordered", parseInt(e.target.value) || 0)
                              }
                              className="w-20"
                            />
                          </TableCell>
                          {((formData.status as string) === "partielle" || (formData.status as string) === "reçue") && (
                            <TableCell>
                              <Input
                                type="number"
                                step="1"
                                value={item.qty_received}
                                onChange={(e) =>
                                  updateItem(index, "qty_received", parseInt(e.target.value) || 0)
                                }
                                className="w-20"
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-right font-medium">
                            {lineTotal.toFixed(2)} €
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-2 text-right">
                <div className="flex justify-end gap-4">
                  <span className="text-muted-foreground">Sous-total HT:</span>
                  <span className="font-medium w-32">
                    {totals.totalHT.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-muted-foreground">TVA:</span>
                  <span className="font-medium w-32">
                    {totals.totalTVA.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
                <div className="flex justify-end gap-4 text-lg">
                  <span className="font-semibold">Total TTC:</span>
                  <span className="font-bold w-32">
                    {totals.totalTTC.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <Label>Note interne</Label>
              <Textarea
                placeholder="Informations complémentaires..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="glass-card"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                className="flex-1 bg-primary hover:bg-primary/90 text-foreground font-semibold"
              >
                Enregistrer
              </Button>
              {editingOrder && (formData.status as string) === "en_attente" && (
                <Button
                  onClick={handleMarkReceived}
                  variant="outline"
                  className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                >
                  Marquer "Reçue"
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="glass-modal max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">
              Détail Commande {viewOrder?.number}
            </DialogTitle>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Fournisseur</Label>
                  <p className="font-medium">{viewOrder.supplier}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(viewOrder.status)} className="rounded-xl">
                      {getStatusLabel(viewOrder.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date commande</Label>
                  <p>{new Date(viewOrder.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date livraison prévue</Label>
                  <p>
                    {viewOrder.expected_date
                      ? new Date(viewOrder.expected_date).toLocaleDateString("fr-FR")
                      : "—"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground mb-2 block">Articles</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>PU HT</TableHead>
                      <TableHead>TVA %</TableHead>
                      <TableHead>Qté cmd</TableHead>
                      <TableHead>Qté reçue</TableHead>
                      <TableHead className="text-right">Total HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewOrder.items || []).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.unit_price_ht.toFixed(2)} €</TableCell>
                        <TableCell>{item.tva_rate} %</TableCell>
                        <TableCell>{item.qty_ordered}</TableCell>
                        <TableCell>{item.qty_received}</TableCell>
                        <TableCell className="text-right">
                          {(item.unit_price_ht * item.qty_ordered).toFixed(2)} €
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {viewOrder.note && (
                <div>
                  <Label className="text-muted-foreground">Note</Label>
                  <p className="text-sm mt-1">{viewOrder.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les commandes reçues ou partielles ne peuvent pas être
              supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventaireAchats;
