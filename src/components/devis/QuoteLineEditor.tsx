import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, GripVertical, Plus, Package, Wrench } from "lucide-react";
import { toast } from "sonner";

export interface QuoteLine {
  id: string;
  item_type: "SERVICE" | "CONSUMABLE" | "CUSTOM";
  service_item_id?: string;
  inventory_item_id?: string;
  name: string;
  description?: string;
  sku?: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
  tva_rate: number;
  discount_value: number;
  discount_type: "percent" | "fixed";
  total_ht: number;
}

interface QuoteLineEditorProps {
  lines: QuoteLine[];
  onChange: (lines: QuoteLine[]) => void;
}

const UNITS = ["unité", "h", "j", "m²", "m", "ml", "forfait", "lot"];
const TVA_RATES = [0, 5.5, 10, 20];

export const QuoteLineEditor = ({ lines, onChange }: QuoteLineEditorProps) => {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);

  useEffect(() => {
    loadCatalogData();
  }, []);

  const loadCatalogData = async () => {
    const [servicesRes, consumablesRes] = await Promise.all([
      supabase.from("service_items").select("*").eq("is_active", true),
      supabase.from("inventory_items").select("*").in("type", ["consommable", "materiel"]),
    ]);
    
    if (servicesRes.data) setServices(servicesRes.data);
    if (consumablesRes.data) setConsumables(consumablesRes.data);
  };

  const addLine = (type: QuoteLine["item_type"]) => {
    const newLine: QuoteLine = {
      id: crypto.randomUUID(),
      item_type: type,
      name: "",
      description: "",
      qty: 1,
      unit: "unité",
      unit_price_ht: 0,
      tva_rate: 20,
      discount_value: 0,
      discount_type: "percent",
      total_ht: 0,
    };
    onChange([...lines, newLine]);
  };

  const addFromCatalog = (item: any, type: "SERVICE" | "CONSUMABLE") => {
    const newLine: QuoteLine = {
      id: crypto.randomUUID(),
      item_type: type,
      service_item_id: type === "SERVICE" ? item.id : undefined,
      inventory_item_id: type === "CONSUMABLE" ? item.id : undefined,
      name: item.name,
      description: item.description || "",
      sku: item.sku,
      qty: 1,
      unit: item.unit || "unité",
      unit_price_ht: type === "SERVICE" ? item.default_price_ht : item.unit_price_ht,
      tva_rate: type === "SERVICE" ? item.default_tva_rate : item.tva_rate || 20,
      discount_value: 0,
      discount_type: "percent",
      total_ht: 0,
    };
    onChange([...lines, newLine]);
    toast.success(`${item.name} ajouté`);
  };

  const updateLine = (index: number, updates: Partial<QuoteLine>) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    
    // Recalculate total_ht
    const line = newLines[index];
    const baseTotal = line.qty * line.unit_price_ht;
    const discount = line.discount_type === "percent" 
      ? baseTotal * (line.discount_value / 100)
      : line.discount_value;
    line.total_ht = Math.max(0, baseTotal - discount);
    
    onChange(newLines);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => addLine("SERVICE")}>
          <Wrench className="mr-2 h-3 w-3" />
          + Service
        </Button>
        <Button size="sm" variant="outline" onClick={() => addLine("CONSUMABLE")}>
          <Package className="mr-2 h-3 w-3" />
          + Consommable
        </Button>
        <Button size="sm" variant="outline" onClick={() => addLine("CUSTOM")}>
          <Plus className="mr-2 h-3 w-3" />
          + Ligne libre
        </Button>
        <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Package className="mr-2 h-3 w-3" />
              Depuis catalogue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Catalogue</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Services</h3>
                <div className="grid grid-cols-2 gap-2">
                  {services.map(s => (
                    <Button
                      key={s.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFromCatalog(s, "SERVICE");
                        setCatalogOpen(false);
                      }}
                      className="justify-start"
                    >
                      {s.name} - {s.default_price_ht.toFixed(2)} €
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Consommables</h3>
                <div className="grid grid-cols-2 gap-2">
                  {consumables.map(c => (
                    <Button
                      key={c.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFromCatalog(c, "CONSUMABLE");
                        setCatalogOpen(false);
                      }}
                      className="justify-start"
                    >
                      {c.name} {c.sku && `(${c.sku})`} - {(c.unit_price_ht || 0).toFixed(2)} €
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={line.id} className="glass-card p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <Input
                placeholder="Nom"
                value={line.name}
                onChange={(e) => updateLine(idx, { name: e.target.value })}
                className="flex-1"
              />
              <Button size="icon" variant="ghost" onClick={() => removeLine(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Description (optionnelle)"
              value={line.description || ""}
              onChange={(e) => updateLine(idx, { description: e.target.value })}
              rows={2}
            />
            <div className="grid grid-cols-6 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="Qté"
                  value={line.qty}
                  onChange={(e) => updateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Select value={line.unit} onValueChange={(v) => updateLine(idx, { unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="PU HT"
                  value={line.unit_price_ht}
                  onChange={(e) => updateLine(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Select value={line.tva_rate.toString()} onValueChange={(v) => updateLine(idx, { tva_rate: parseFloat(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TVA_RATES.map(t => <SelectItem key={t} value={t.toString()}>{t}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Remise"
                  value={line.discount_value}
                  onChange={(e) => updateLine(idx, { discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="font-semibold flex items-center">
                {line.total_ht.toFixed(2)} € HT
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
