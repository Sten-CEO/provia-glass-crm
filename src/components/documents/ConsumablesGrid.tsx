import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Package } from "lucide-react";
import { DocumentLine, DOCUMENT_UNITS, VAT_RATES } from "@/types/documents";
import { Badge } from "@/components/ui/badge";

interface ConsumablesGridProps {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  disabled?: boolean;
}

export function ConsumablesGrid({ lines, onChange, disabled }: ConsumablesGridProps) {
  const consumableLines = lines.filter(l => l.type === "consumable" || l.type === "material");

  const updateLine = (index: number, updates: Partial<DocumentLine>) => {
    const actualIndex = lines.findIndex(l => l.id === consumableLines[index].id);
    const updatedLine = { ...lines[actualIndex], ...updates };
    
    // Recalcul automatique des totaux
    const subtotal = updatedLine.qty * updatedLine.unitPriceHT;
    const discount = subtotal * (updatedLine.discountPct || 0) / 100;
    updatedLine.totalHT = subtotal - discount;
    updatedLine.totalVAT = updatedLine.totalHT * (updatedLine.vatRate / 100);
    updatedLine.totalTTC = updatedLine.totalHT + updatedLine.totalVAT;

    const newLines = [...lines];
    newLines[actualIndex] = updatedLine;
    onChange(newLines);
  };

  const deleteLine = (index: number) => {
    const actualIndex = lines.findIndex(l => l.id === consumableLines[index].id);
    onChange(lines.filter((_, i) => i !== actualIndex));
  };

  const addConsumable = () => {
    const newLine: DocumentLine = {
      id: crypto.randomUUID(),
      type: "consumable",
      label: "",
      description: "",
      qty: 1,
      unit: "unité",
      unitPriceHT: 0,
      vatRate: 20,
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0,
      serialNumber: "",
      location: "",
      supplierLot: "",
    };
    onChange([...lines, newLine]);
  };

  const addMaterial = () => {
    const newLine: DocumentLine = {
      id: crypto.randomUUID(),
      type: "material",
      label: "",
      description: "",
      qty: 1,
      unit: "unité",
      unitPriceHT: 0,
      vatRate: 20,
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0,
      serialNumber: "",
      location: "",
      costPriceHT: 0,
    };
    onChange([...lines, newLine]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Consommables & Matériel
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addConsumable} disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            Consommable
          </Button>
          <Button size="sm" variant="outline" onClick={addMaterial} disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            Matériel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 w-[80px]">Type</th>
              <th className="text-left p-2 w-[200px]">Désignation</th>
              <th className="text-left p-2 w-[100px]">N° Série</th>
              <th className="text-left p-2 w-[120px]">Emplacement</th>
              <th className="text-left p-2 w-[100px]">Lot/Commande</th>
              <th className="text-right p-2 w-[70px]">Qté</th>
              <th className="text-right p-2 w-[100px]">P.U. HT</th>
              <th className="text-right p-2 w-[70px]">TVA %</th>
              <th className="text-right p-2 w-[100px]">Total HT</th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {consumableLines.map((line, index) => (
              <tr key={line.id} className="border-b hover:bg-muted/50">
                <td className="p-2">
                  <Badge variant={line.type === "material" ? "default" : "secondary"}>
                    {line.type === "material" ? "Matériel" : "Conso."}
                  </Badge>
                </td>
                <td className="p-2">
                  <Input
                    value={line.label}
                    onChange={(e) => updateLine(index, { label: e.target.value })}
                    placeholder="Désignation"
                    disabled={disabled}
                    className="text-sm mb-1"
                  />
                  <Input
                    value={line.ref || ""}
                    onChange={(e) => updateLine(index, { ref: e.target.value })}
                    placeholder="Référence"
                    disabled={disabled}
                    className="text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={line.serialNumber || ""}
                    onChange={(e) => updateLine(index, { serialNumber: e.target.value })}
                    placeholder="N° série"
                    disabled={disabled}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={line.location || ""}
                    onChange={(e) => updateLine(index, { location: e.target.value })}
                    placeholder="Dépôt/Zone"
                    disabled={disabled}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  {line.type === "consumable" && (
                    <Input
                      value={line.supplierLot || ""}
                      onChange={(e) => updateLine(index, { supplierLot: e.target.value })}
                      placeholder="Lot/Cmd"
                      disabled={disabled}
                      className="text-sm"
                    />
                  )}
                  {line.type === "material" && (
                    <Input
                      type="number"
                      value={line.costPriceHT || 0}
                      onChange={(e) => updateLine(index, { costPriceHT: parseFloat(e.target.value) || 0 })}
                      placeholder="Coût"
                      disabled={disabled}
                      className="text-sm text-right"
                    />
                  )}
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(index, { qty: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="1"
                    disabled={disabled}
                    className="text-sm text-right"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    value={line.unitPriceHT}
                    onChange={(e) => updateLine(index, { unitPriceHT: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    className="text-sm text-right"
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={String(line.vatRate)}
                    onValueChange={(value) => updateLine(index, { vatRate: parseFloat(value) })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="text-sm w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_RATES.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2 text-right font-medium">
                  {line.totalHT.toFixed(2)} €
                </td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteLine(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {consumableLines.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucun consommable ou matériel ajouté. Cliquez sur "Consommable" ou "Matériel" pour commencer.
        </div>
      )}
    </div>
  );
}
