import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTaxes } from "@/hooks/useTaxes";

interface ConsumablesSectionProps {
  interventionId: string | undefined;
}

export function ConsumablesSection({ interventionId }: ConsumablesSectionProps) {
  const [lines, setLines] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const taxesQuery = useTaxes();
  const taxes = taxesQuery.data || [];

  useEffect(() => {
    loadInventoryItems();
    if (interventionId) {
      loadLines();
    }
  }, [interventionId]);

  const loadInventoryItems = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .in("type", ["consumable", "material"])
      .order("name");
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

    // Get the line to check quantity
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
      unit: item.type === "consumable" ? "unité" : "unité",
      unit_price_ht: item.unit_price_ht || 0,
      tax_rate: item.tva_rate || 20,
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

    // Create planned inventory movement instead of immediate consumption
    await supabase.from("inventory_movements").insert([{
      item_id: itemId,
      type: "out",
      qty: qty,
      source: "intervention",
      ref_id: interventionId,
      note: `Prévisionnel intervention`,
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

  const totals = lines.reduce((acc, line) => {
    const ht = line.quantity * line.unit_price_ht;
    const ttc = ht * (1 + line.tax_rate / 100);
    return {
      totalHT: acc.totalHT + ht,
      totalTTC: acc.totalTTC + ttc,
    };
  }, { totalHT: 0, totalTTC: 0 });

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
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun consommable ajouté. Cliquez sur "Ajouter" pour commencer.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>N° série</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead>PU HT</TableHead>
                  <TableHead>TVA %</TableHead>
                  <TableHead>Total HT</TableHead>
                  <TableHead>Total TTC</TableHead>
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
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="none">Sélectionner un produit</SelectItem>
                          {inventoryItems.map((item) => {
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
                          })}
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
                      <Input 
                        type="number"
                        value={line.unit_price_ht} 
                        onChange={(e) => updateLine(line.id, "unit_price_ht", parseFloat(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={line.tax_rate?.toString()} 
                        onValueChange={(v) => updateLine(line.id, "tax_rate", parseFloat(v))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taxes.map((tax) => (
                            <SelectItem key={tax.rate} value={tax.rate.toString()}>
                              {tax.rate}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{(line.quantity * line.unit_price_ht).toFixed(2)} €</TableCell>
                    <TableCell>
                      {(line.quantity * line.unit_price_ht * (1 + line.tax_rate / 100)).toFixed(2)} €
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

            <div className="mt-4 flex justify-end gap-8 text-sm font-medium">
              <div>Total HT: {totals.totalHT.toFixed(2)} €</div>
              <div>Total TTC: {totals.totalTTC.toFixed(2)} €</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
