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

  useEffect(() => {
    if (interventionId) {
      loadLines();
    }
  }, [interventionId]);

  useEffect(() => {
    loadInventoryItems();
  }, [itemCategory]);

  const loadInventoryItems = async () => {
    // Map UI category to DB type
    const dbType = itemCategory === "consumable" ? "consommable" : "matériel";
    
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("type", dbType)
      .order("name");
    
    if (error) {
      console.error("Error loading inventory items:", error);
      toast.error("Erreur lors du chargement des produits");
      return;
    }
    
    console.log(`Loaded ${data?.length || 0} items for type: ${dbType}`, data);
    if (data) setInventoryItems(data);
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

    // Check stock availability
    if (item.qty_on_hand < qty) {
      const confirmed = window.confirm(
        `Stock insuffisant! Disponible: ${item.qty_on_hand}, demandé: ${qty}.\n\nVoulez-vous continuer quand même?`
      );
      if (!confirmed) return;
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

    // Get intervention number for the movement reference
    let interventionNumber = "";
    if (interventionId) {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("intervention_number")
        .eq("id", interventionId)
        .single();
      interventionNumber = jobData?.intervention_number || "";
    }

    // Create planned inventory movement
    await supabase.from("inventory_movements").insert([{
      item_id: itemId,
      type: "out",
      qty: qty,
      source: "intervention",
      ref_id: interventionId,
      ref_number: interventionNumber,
      note: `Prévisionnel intervention ${interventionNumber}`,
      status: "planned",
      scheduled_at: new Date().toISOString(),
    }]);

    // Reserve the stock
    await supabase
      .from("inventory_items")
      .update({ 
        qty_reserved: (item.qty_reserved || 0) + qty 
      })
      .eq("id", itemId);

    loadLines();
    loadInventoryItems();
    toast.success("Article ajouté avec réservation de stock");
  };

  const deleteLine = async (lineId: string) => {
    const { error } = await supabase
      .from("intervention_consumables")
      .delete()
      .eq("id", lineId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    setLines(lines.filter(l => l.id !== lineId));
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
            onValueChange={(val) => setItemCategory(val as "consumable" | "material")} 
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
                      value={line.inventory_item_id || "none"} 
                      onValueChange={(v) => v !== "none" && selectInventoryItem(line.id, v)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Sélectionner un produit" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-popover max-h-[300px] overflow-y-auto">
                        <SelectItem value="none">Sélectionner un produit</SelectItem>
                        {inventoryItems.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            Aucun {itemCategory === "consumable" ? "consommable" : "matériau"} disponible
                          </div>
                        ) : (
                          inventoryItems.map((item) => {
                            const available = item.qty_on_hand - (item.qty_reserved || 0);
                            return (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {item.sku && <span className="text-xs text-muted-foreground">({item.sku})</span>}
                                  <span className={`text-xs ${available <= 0 ? 'text-destructive' : 'text-success'}`}>
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
