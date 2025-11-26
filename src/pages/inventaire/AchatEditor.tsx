import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Trash2, Plus, X, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createInventoryMovement, cancelMovement } from "@/lib/inventoryMovements";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCompany } from "@/hooks/useCompany";

interface PurchaseItem {
  id?: string;
  type: "consommable" | "materiel";
  item_id?: string;
  item_name: string;
  sku: string;
  unit_price_ht: number;
  vat_rate: number;
  qty_ordered: number;
  qty_received: number;
  total_ht: number;
}

interface PurchaseOrder {
  id?: string;
  number: string;
  supplier: string;
  order_date: string;
  expected_date: string;
  delivery_site: string;
  status: "en_attente" | "partielle" | "reçue" | "annulée";
  notes: string;
  items: PurchaseItem[];
}

const AchatEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { company } = useCompany();

  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  const [formData, setFormData] = useState<PurchaseOrder>({
    number: "",
    supplier: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    delivery_site: "Dépôt principal",
    status: "en_attente",
    notes: "",
    items: [],
  });

  useEffect(() => {
    loadInventoryItems();
    if (isEditing) {
      loadPurchaseOrder();
    } else {
      generateOrderNumber();
    }
  }, [id, company?.id]);

  // Realtime subscription for inventory updates
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('inventory_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `company_id=eq.${company.id}`
        },
        () => {
          loadInventoryItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id]);

  const loadInventoryItems = async () => {
    if (!company?.id) return;

    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("company_id", company.id)
      .order("name");
    if (data) setInventoryItems(data);
  };

  const loadPurchaseOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erreur de chargement");
      navigate("/inventaire/achats");
    } else if (data) {
      setFormData({
        id: data.id,
        number: data.number,
        supplier: data.supplier || "",
        order_date: data.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        expected_date: data.expected_date || "",
        delivery_site: "Dépôt principal",
        status: data.status as any,
        notes: data.note || "",
        items: Array.isArray(data.items) ? (data.items as any) : [],
      });
    }
    setLoading(false);
  };

  const generateOrderNumber = async () => {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("purchase_orders")
      .select("number")
      .like("number", `ACH-${year}-%`)
      .order("number", { ascending: false })
      .limit(1);

    let seq = 1;
    if (data && data.length > 0) {
      const lastNum = data[0].number.split("-")[2];
      seq = parseInt(lastNum) + 1;
    }
    setFormData((prev) => ({ ...prev, number: `ACH-${year}-${String(seq).padStart(3, "0")}` }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          type: "consommable",
          item_name: "",
          sku: "",
          unit_price_ht: 0,
          vat_rate: 20,
          qty_ordered: 1,
          qty_received: 0,
          total_ht: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total_ht
      if (field === "unit_price_ht" || field === "qty_ordered") {
        newItems[index].total_ht = newItems[index].unit_price_ht * newItems[index].qty_ordered;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const selectInventoryItem = (index: number, itemId: string) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    if (item) {
      setFormData((prev) => {
        const newItems = [...prev.items];
        newItems[index] = {
          ...newItems[index],
          item_id: item.id,
          item_name: item.name,
          sku: item.sku || "",
          unit_price_ht: item.unit_cost_ht || 0,
          type: item.type as "consommable" | "materiel",
          total_ht: (item.unit_cost_ht || 0) * newItems[index].qty_ordered
        };
        return { ...prev, items: newItems };
      });
    }
  };

  const calculateTotals = () => {
    const subtotalHT = formData.items.reduce((sum, item) => sum + item.total_ht, 0);
    const totalVAT = formData.items.reduce(
      (sum, item) => sum + item.total_ht * (item.vat_rate / 100),
      0
    );
    const totalTTC = subtotalHT + totalVAT;
    return { subtotalHT, totalVAT, totalTTC };
  };

  // Synchronize inventory movements after saving the purchase
  const syncMovementsForPurchase = async (refId: string) => {
    if (!company?.id) {
      console.error("Cannot sync movements without company_id");
      toast.error("Erreur: entreprise non chargée");
      return;
    }

    let createdPlanned = 0;
    let createdDone = 0;
    try {
      // Cancel existing planned movements for this purchase (if any)
      const { data: existing } = await supabase
        .from("inventory_movements")
        .select("id, status")
        .eq("source", "achat")
        .eq("ref_id", refId)
        .eq("company_id", company.id);

      if (existing && existing.length > 0) {
        for (const m of existing) {
          if (m.status === "planned") {
            await cancelMovement(m.id);
          }
        }
      }

      for (const item of formData.items) {
        if (!item.item_id) continue;
        const qtyOrdered = Number(item.qty_ordered) || 0;
        const qtyReceived = Number(item.qty_received) || 0;

        if (formData.status === "en_attente") {
          // Create planned inbound movement for expected date
          if (qtyOrdered > 0) {
            await createInventoryMovement({
              company_id: company.id,
              item_id: item.item_id,
              type: "in",
              qty: qtyOrdered,
              source: "achat",
              ref_id: refId,
              ref_number: formData.number,
              note: `En attente • réception prévue le ${formData.expected_date || ""} • ${formData.delivery_site}`,
              status: "planned",
              date: formData.expected_date ? new Date(formData.expected_date).toISOString() : undefined,
            });
            createdPlanned += 1;
          }
        } else if (formData.status === "reçue") {
          // Convert to real inbound movement (prefer received, fallback to ordered)
          const qty = qtyReceived > 0 ? qtyReceived : qtyOrdered;
          if (qty > 0) {
            await createInventoryMovement({
              company_id: company.id,
              item_id: item.item_id,
              type: "in",
              qty,
              source: "achat",
              ref_id: refId,
              ref_number: formData.number,
              note: `Réception ${formData.delivery_site}`,
              status: "done",
            });
            createdDone += 1;
          }
        } else if (formData.status === "partielle") {
          // Create done for received and planned for remaining
          if (qtyReceived > 0) {
            await createInventoryMovement({
              company_id: company.id,
              item_id: item.item_id,
              type: "in",
              qty: qtyReceived,
              source: "achat",
              ref_id: refId,
              ref_number: formData.number,
              note: `Réception partielle ${formData.delivery_site}`,
              status: "done",
            });
            createdDone += 1;
          }
          const remaining = Math.max(0, qtyOrdered - qtyReceived);
          if (remaining > 0) {
            await createInventoryMovement({
              company_id: company.id,
              item_id: item.item_id,
              type: "in",
              qty: remaining,
              source: "achat",
              ref_id: refId,
              ref_number: formData.number,
              note: `Reste à recevoir ${formData.delivery_site}`,
              status: "planned",
              date: formData.expected_date ? new Date(formData.expected_date).toISOString() : undefined,
            });
            createdPlanned += 1;
          }
        } else if (formData.status === "annulée") {
          // Enregistrer un mouvement annulé pour trace
          if (qtyOrdered > 0 || qtyReceived > 0) {
            await createInventoryMovement({
              company_id: company.id,
              item_id: item.item_id,
              type: "in",
              qty: qtyReceived > 0 ? qtyReceived : qtyOrdered,
              source: "achat",
              ref_id: refId,
              ref_number: formData.number,
              note: `Commande annulée ${formData.delivery_site}`,
              status: "canceled",
            });
          }
        }
      }

      // Emit refresh event for lists depending on inventory
      eventBus.emit(EVENTS.DATA_CHANGED, { scope: "inventory" });

      if (createdDone + createdPlanned === 0) {
        toast.message("Aucun mouvement créé", { description: "Vérifiez les quantités des lignes." });
      } else {
        toast.success(
          `${createdDone} mouvement(s) confirmé(s)${createdPlanned ? `, ${createdPlanned} prévu(s)` : ""}`
        );
      }
    } catch (err) {
      console.error("syncMovementsForPurchase error", err);
      toast.error("Échec de la synchronisation des mouvements");
      throw err;
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.number.trim()) {
      toast.error("Référence requise");
      return;
    }
    if (!formData.supplier.trim()) {
      toast.error("Fournisseur requis");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Ajoutez au moins un article");
      return;
    }
    
    // Vérifier que tous les articles sont liés à un item d'inventaire
    const itemsWithoutId = formData.items.filter(item => !item.item_id);
    if (itemsWithoutId.length > 0) {
      toast.error("Tous les articles doivent être sélectionnés depuis l'inventaire");
      return;
    }

    setLoading(true);

    // Check unique reference (only if creating or number changed)
    if (!isEditing || formData.number !== (await getCurrentNumber())) {
      const { data: existing } = await supabase
        .from("purchase_orders")
        .select("id")
        .eq("number", formData.number)
        .neq("id", id || "");
      
      if (existing && existing.length > 0) {
        toast.error("Référence déjà utilisée");
        setLoading(false);
        return;
      }
    }

    const payload = {
      company_id: company?.id,
      number: formData.number,
      supplier: formData.supplier,
      expected_date: formData.expected_date || null,
      status: formData.status,
      kind: "consommable",
      items: formData.items as any,
      note: formData.notes,
      files: [] as any,
    };

    const { data: savedData, error } = isEditing
      ? await supabase.from("purchase_orders").update(payload).eq("id", id).select().single()
      : await supabase.from("purchase_orders").insert([payload]).select().single();

    if (error) {
      console.error("Save error:", error);
      if ((error as any).code === "23505") {
        toast.error("Référence déjà utilisée");
      } else if ((error as any).code === "23514") {
        toast.error("Vérifiez que tous les champs sont corrects");
      } else {
        toast.error("Échec de l'enregistrement. Réessayez.");
      }
    } else {
      const refId = (savedData?.id || id) as string;
      try {
        await syncMovementsForPurchase(refId);
      } catch (e) {
        console.error("Sync mouvements achat:", e);
      }
      
      // Créer notification si statut en_attente avec date prévue
      console.log("🔔 Vérification notification pending:", {
        status: formData.status,
        hasDate: !!formData.expected_date,
        hasCompany: !!company?.id,
        companyId: company?.id
      });
      
      if (formData.status === "en_attente" && formData.expected_date && company?.id) {
        const dateFormatted = new Date(formData.expected_date).toLocaleDateString('fr-FR');
        console.log("🔔 Tentative création notification pending...");
        
        const notifData = {
          kind: "purchase_pending",
          type: "purchase_pending",
          title: "Commande en cours de livraison",
          message: `La commande ${formData.number} de ${formData.supplier} est en cours de livraison. Réception prévue le ${dateFormatted}`,
          company_id: company.id,
          link: `/inventaire/achats/${refId}`,
          level: "info",
        };
        console.log("🔔 Données notification:", notifData);
        
        const { data: notifResult, error: notifError } = await supabase.from("notifications").insert(notifData).select();
        
        if (notifError) {
          console.error("❌ Erreur création notification pending:", notifError);
        } else {
          console.log("✅ Notification pending créée:", notifResult);
        }
      }
      
      toast.success("Commande enregistrée");
      navigate("/inventaire/achats");
    }
    setLoading(false);
  };

  const getCurrentNumber = async () => {
    if (!id) return "";
    const { data } = await supabase
      .from("purchase_orders")
      .select("number")
      .eq("id", id)
      .single();
    return data?.number || "";
  };

  const handleMarkReceived = async () => {
    if (!id) {
      toast.error("Enregistrez d'abord la commande");
      return;
    }

    setLoading(true);

    try {
      // Lieu obligatoire pour réception
      if (!formData.delivery_site) {
        toast.error("Lieu de livraison requis");
        setLoading(false);
        return;
      }

      // Créer un mouvement d'entrée par ligne reçue (>0)
      for (const item of formData.items) {
        const qty = Number(item.qty_received) || 0;
        if (item.item_id && qty > 0) {
          // Stock avant/après pour trace (stock réel mis à jour par createInventoryMovement -> updateItemStock)
          const { data: currentItem } = await supabase
            .from("inventory_items")
            .select("qty_on_hand, qty_reserved")
            .eq("id", item.item_id)
            .single();

          const before = currentItem?.qty_on_hand ?? 0;
          const after = before + qty;

          await createInventoryMovement({
            item_id: item.item_id,
            type: "in",
            qty,
            source: "achat",
            ref_id: id,
            ref_number: formData.number,
            note: `Réception ${formData.delivery_site} • avant=${before} après=${after} • ${item.item_name || ""}`.trim(),
            status: "done",
          });
        }
      }

      // Mettre à jour le statut et persister les lignes (qty_received)
      await supabase
        .from("purchase_orders")
        .update({ status: "reçue", items: formData.items as any })
        .eq("id", id);

      // Créer une notification (CRM uniquement, pas pour l'app mobile)
      console.log("🔔 Tentative création notification received, company:", company?.id);
      
      if (company?.id) {
        const notifData = {
          kind: "purchase_received",
          type: "purchase_received",
          title: "Achat reçu",
          message: `La commande ${formData.number} de ${formData.supplier} a été reçue`,
          company_id: company.id,
          link: `/inventaire/achats/${id}`,
          level: "success",
        };
        console.log("🔔 Données notification received:", notifData);
        
        const { data: notifResult, error: notifError } = await supabase.from("notifications").insert(notifData).select();
        
        if (notifError) {
          console.error("❌ Erreur création notification received:", notifError);
        } else {
          console.log("✅ Notification received créée avec succès:", notifResult);
        }
      } else {
        console.warn("⚠️ Pas de company_id, notification non créée");
      }

      toast.success("Commande enregistrée et stock mis à jour.");
      navigate("/inventaire/achats");
    } catch (error) {
      console.error(error);
      toast.error("Échec de la mise à jour");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    setLoading(true);
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);

    if (error) {
      toast.error("Échec de la suppression");
    } else {
      toast.success("Commande supprimée");
      navigate("/inventaire/achats");
    }
    setLoading(false);
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inventaire/achats")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Modifier commande" : "Nouvelle commande"}
            </h1>
            {isEditing && (
              <p className="text-muted-foreground">{formData.number}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing && formData.status !== "reçue" && formData.status !== "annulée" && (
            <Button onClick={handleMarkReceived} disabled={loading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Marquer "Reçue"
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
          {isEditing && (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={loading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - General Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Général</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Référence *</Label>
              <Input
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="ACH-2025-001"
              />
            </div>

            <div>
              <Label>Fournisseur *</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Nom du fournisseur"
              />
            </div>

            <div>
              <Label>Date commande</Label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Date livraison prévue</Label>
              <Input
                type="date"
                value={formData.expected_date}
                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Lieu de livraison</Label>
              <Select
                value={formData.delivery_site}
                onValueChange={(value) => setFormData({ ...formData, delivery_site: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dépôt principal">Dépôt principal</SelectItem>
                  <SelectItem value="Véhicule 1">Véhicule 1</SelectItem>
                  <SelectItem value="Véhicule 2">Véhicule 2</SelectItem>
                  <SelectItem value="Chantier">Chantier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
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

            <div>
              <Label>Notes internes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Notes..."
              />
            </div>
          </div>
        </Card>

        {/* Right Column - Items */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Articles</h2>
            <Button onClick={addItem} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une ligne
            </Button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline">{item.type === "consommable" ? "Consommable" : "Matériel"}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Type</Label>
                    <Select
                      value={item.type}
                      onValueChange={(value: any) => updateItem(index, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consommable">Consommable</SelectItem>
                        <SelectItem value="materiel">Matériel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Article *</Label>
                    <Select
                      value={item.item_id || undefined}
                      onValueChange={(value) => selectInventoryItem(index, value)}
                      disabled={inventoryItems.filter((i) => i.type === item.type).length === 0}
                    >
                      <SelectTrigger className={!item.item_id ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner depuis l'inventaire..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50 max-h-[300px]">
                        {inventoryItems.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Aucun article dans l'inventaire
                          </div>
                        ) : inventoryItems.filter((i) => i.type === item.type).length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Aucun {item.type} disponible
                          </div>
                        ) : (
                          inventoryItems
                            .filter((i) => i.type === item.type)
                            .map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} {i.sku ? `(${i.sku})` : ""} - Stock: {i.qty_on_hand || 0}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    {inventoryItems.filter((i) => i.type === item.type).length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {inventoryItems.length === 0
                          ? "⚠️ Aucun article dans l'inventaire. Créez des articles dans Inventaire > Consommables ou Matériels."
                          : `⚠️ Aucun ${item.type} disponible. Créez un ${item.type} dans l'inventaire ou changez le type ci-dessus.`}
                      </p>
                    )}
                    {!item.item_id && inventoryItems.filter((i) => i.type === item.type).length > 0 && (
                      <p className="text-xs text-destructive mt-1">Article requis</p>
                    )}
                  </div>

                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={item.sku}
                      disabled
                      placeholder="Auto"
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Label>PU HT (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price_ht}
                      onChange={(e) => updateItem(index, "unit_price_ht", parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label>TVA %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={item.vat_rate}
                      onChange={(e) => updateItem(index, "vat_rate", parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label>Qté commandée</Label>
                    <Input
                      type="number"
                      value={item.qty_ordered}
                      onChange={(e) => updateItem(index, "qty_ordered", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label>Qté reçue</Label>
                    <Input
                      type="number"
                      value={item.qty_received}
                      onChange={(e) => updateItem(index, "qty_received", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label>Total HT (€)</Label>
                    <Input
                      type="number"
                      value={item.total_ht.toFixed(2)}
                      disabled
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-6 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-medium">{totals.subtotalHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span className="font-medium">{totals.totalVAT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span>{totals.totalTTC.toFixed(2)} €</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La commande sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AchatEditor;
