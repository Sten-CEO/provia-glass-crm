import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConsumablesSectionProps {
  interventionId: string | undefined;
}

export function ConsumablesSection({ interventionId }: ConsumablesSectionProps) {
  const [lines, setLines] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [itemCategory, setItemCategory] = useState<"consumable" | "material">("consumable");
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    if (interventionId) {
      loadLines();
    }
  }, [interventionId]);

  // Load items when category changes - force complete reset
  useEffect(() => {
    setInventoryItems([]); // Clear immediately to force UI refresh
    loadInventoryItems();
  }, [itemCategory]);

  const loadInventoryItems = async () => {
    setIsLoadingItems(true);
    
    // Map UI category to DB type - strict mapping
    const dbType = itemCategory === "consumable" ? "consommable" : "materiel";
    
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("type", dbType)
      .order("name");
    
    if (error) {
      console.error("Error loading inventory items:", error);
      toast.error("Erreur lors du chargement des produits");
      setIsLoadingItems(false);
      return;
    }
    
    console.log(`✅ Loaded ${data?.length || 0} items for type: ${dbType}`, data);
    setInventoryItems(data || []);
    setIsLoadingItems(false);
  };

  const loadLines = async () => {
    if (!interventionId) return;
    const { data } = await supabase
      .from("intervention_consumables")
      .select("*")
      .eq("intervention_id", interventionId);
    if (data) setLines(data);
  };

  const addLine = async () => {
    if (!interventionId) {
      toast.error("Veuillez d'abord enregistrer l'intervention");
      return;
    }

    const newLine = {
      intervention_id: interventionId,
      product_name: "",
      quantity: 1,
      unit: "unité",
      unit_price_ht: 0,
      tax_rate: 20,
    };

    const { data, error } = await supabase
      .from("intervention_consumables")
      .insert([newLine])
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'ajout");
      return;
    }

    setLines([...lines, data]);
  };

  const updateLine = async (lineId: string, field: string, value: any) => {
    const { error } = await supabase
      .from("intervention_consumables")
      .update({ [field]: value })
      .eq("id", lineId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    setLines(lines.map(l => l.id === lineId ? { ...l, [field]: value } : l));
  };

  const selectInventoryItem = async (lineId: string, itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const line = lines.find(l => l.id === lineId);
    const qty = line?.quantity || 1;

    // Calculate available stock
    const available = (item.qty_on_hand || 0) - (item.qty_reserved || 0);

    // Check stock availability - block for materials, warn for consumables
    if (available < qty) {
      if (itemCategory === "material") {
        toast.error(`Stock insuffisant! Disponible: ${available}, demandé: ${qty}. Impossible de réserver plus que le stock disponible pour les matériaux.`);
        return;
      } else {
        const confirmed = window.confirm(
          `Stock insuffisant! Disponible: ${available}, demandé: ${qty}.\n\nVoulez-vous continuer quand même?`
        );
        if (!confirmed) return;
      }
    }

    const updates = {
      inventory_item_id: itemId,
      product_ref: item.sku || "",
      product_name: item.name,
      unit: "unité",
      location: item.location || "",
    };

    const { error } = await supabase
      .from("intervention_consumables")
      .update(updates)
      .eq("id", lineId);

    if (error) {
      toast.error("Erreur lors de la sélection");
      return;
    }

    // Get intervention details
    let interventionNumber = "";
    let interventionDate = new Date().toISOString();
    if (interventionId) {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("intervention_number, date")
        .eq("id", interventionId)
        .single();
      interventionNumber = jobData?.intervention_number || "";
      interventionDate = jobData?.date ? new Date(jobData.date).toISOString() : interventionDate;
    }

    // Different logic for consumables vs materials
    if (itemCategory === "consumable") {
      // Consumables: create planned_deduction (will decrement stock when intervention completes)
      await supabase.from("inventory_movements").insert([{
        item_id: itemId,
        type: "expected_out",
        qty: qty,
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `À prévoir: consommation intervention ${interventionNumber}`,
        status: "planned",
        scheduled_at: interventionDate,
      }]);

      // Update reserved quantity for planned consumables too
      await supabase
        .from("inventory_items")
        .update({ 
          qty_reserved: (item.qty_reserved || 0) + qty 
        })
        .eq("id", itemId);
      
      toast.success(`Consommable ajouté - À prévoir le ${new Date(interventionDate).toLocaleDateString()}`);
    } else {
      // Materials: reserve immediately (won't decrement stock, will be returned)
      await supabase.from("inventory_movements").insert([{
        item_id: itemId,
        type: "reserve",
        qty: qty,
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `Réservation matériel intervention ${interventionNumber}`,
        status: "planned",
        scheduled_at: interventionDate,
      }]);

      // Reserve the stock
      await supabase
        .from("inventory_items")
        .update({ 
          qty_reserved: (item.qty_reserved || 0) + qty 
        })
        .eq("id", itemId);

      toast.success("Matériel réservé - sera restitué après l'intervention");
    }

    loadLines();
    loadInventoryItems();
  };

  const deleteLine = async (lineId: string) => {
    // Get the line details before deleting to clean up inventory movements
    const lineToDelete = lines.find(l => l.id === lineId);
    
    const { error } = await supabase
      .from("intervention_consumables")
      .delete()
      .eq("id", lineId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    // Cancel associated inventory movements and update reserved quantity
    if (lineToDelete?.inventory_item_id && interventionId) {
      // Cancel the planned movement
      await supabase
        .from("inventory_movements")
        .update({ status: "canceled" })
        .eq("ref_id", interventionId)
        .eq("item_id", lineToDelete.inventory_item_id)
        .eq("status", "planned");

      // Update reserved quantity
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_reserved")
        .eq("id", lineToDelete.inventory_item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({ 
            qty_reserved: Math.max(0, (item.qty_reserved || 0) - lineToDelete.quantity)
          })
          .eq("id", lineToDelete.inventory_item_id);
      }
    }

    setLines(lines.filter(l => l.id !== lineId));
    loadInventoryItems();
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Consommables & Matériaux utilisés</CardTitle>
          <Button onClick={addLine} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category selector */}
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <RadioGroup 
            value={itemCategory} 
            onValueChange={(val) => {
              const newCategory = val as "consumable" | "material";
              console.log(`🔄 Category change: ${itemCategory} → ${newCategory}`);
              setItemCategory(newCategory);
            }} 
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="consumable" id="consumable" />
              <Label htmlFor="consumable" className="cursor-pointer font-normal">Consommable</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="material" id="material" />
              <Label htmlFor="material" className="cursor-pointer font-normal">Matériau</Label>
            </div>
          </RadioGroup>
          {itemCategory === "material" && (
            <p className="text-xs text-muted-foreground">
              💡 Les matériaux sont réservés et seront restitués après l'intervention (pas de déduction de stock)
            </p>
          )}
          {itemCategory === "consumable" && (
            <p className="text-xs text-muted-foreground">
              💡 Les consommables seront déduits du stock à la fin de l'intervention
            </p>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun article ajouté. Cliquez sur "Ajouter" pour commencer.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Qté</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>N° série</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Select 
                      key={`${line.id}-${itemCategory}`}
                      value={line.inventory_item_id || "none"} 
                      onValueChange={(v) => v !== "none" && selectInventoryItem(line.id, v)}
                      disabled={isLoadingItems}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={isLoadingItems ? "Chargement..." : "Sélectionner un produit"} />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-popover max-h-[300px] overflow-y-auto">
                        <SelectItem value="none" disabled>Sélectionner un produit</SelectItem>
                        {isLoadingItems ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            Chargement...
                          </div>
                        ) : inventoryItems.length === 0 ? (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Aucun {itemCategory === "consumable" ? "consommable" : "matériau"} disponible
                            </p>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(`/inventaire/${itemCategory === "consumable" ? "consommables" : "materiels"}`, '_blank')}
                              className="text-xs"
                            >
                              Créer un {itemCategory === "consumable" ? "consommable" : "matériau"}
                            </Button>
                          </div>
                        ) : (
                          inventoryItems
                            .filter(item => {
                              // Double-check filtering client-side for safety
                              const expectedType = itemCategory === "consumable" ? "consommable" : "materiel";
                              return (item.type || "").toLowerCase() === expectedType;
                            })
                            .map((item) => {
                              const available = (item.qty_on_hand || 0) - (item.qty_reserved || 0);
                              const isOutOfStock = available <= 0;
                              return (
                                <SelectItem 
                                  key={item.id} 
                                  value={item.id}
                                  disabled={isOutOfStock && itemCategory === "material"}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={isOutOfStock ? "text-muted-foreground" : ""}>{item.name}</span>
                                    {item.sku && <span className="text-xs text-muted-foreground">· {item.sku}</span>}
                                    <span className={`text-xs font-medium ${isOutOfStock ? 'text-destructive' : 'text-success'}`}>
                                      • Dispo: {available}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={line.product_ref || ""} 
                      onChange={(e) => updateLine(line.id, "product_ref", e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      value={line.quantity} 
                      onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value))}
                      className="w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={line.unit} 
                      onChange={(e) => updateLine(line.id, "unit", e.target.value)}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={line.serial_number || ""} 
                      onChange={(e) => updateLine(line.id, "serial_number", e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={line.location || ""} 
                      onChange={(e) => updateLine(line.id, "location", e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteLine(line.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
