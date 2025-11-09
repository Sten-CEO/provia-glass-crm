import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { DocumentLine, DOCUMENT_UNITS, VAT_RATES } from "@/types/documents";

interface ServicesGridProps {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  disabled?: boolean;
}

export function ServicesGrid({ lines, onChange, disabled }: ServicesGridProps) {
  const serviceLines = lines.filter(l => l.type === "service");

  const updateLine = (index: number, updates: Partial<DocumentLine>) => {
    const actualIndex = lines.findIndex(l => l.id === serviceLines[index].id);
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
    const actualIndex = lines.findIndex(l => l.id === serviceLines[index].id);
    onChange(lines.filter((_, i) => i !== actualIndex));
  };

  const addLine = () => {
    const newLine: DocumentLine = {
      id: crypto.randomUUID(),
      type: "service",
      label: "",
      description: "",
      qty: 1,
      unit: "unité",
      unitPriceHT: 0,
      vatRate: 20,
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0,
    };
    onChange([...lines, newLine]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Services / Prestations</h3>
        <Button size="sm" variant="outline" onClick={addLine} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une prestation
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 w-[250px]">Désignation</th>
              <th className="text-left p-2 w-[120px]">Réf.</th>
              <th className="text-right p-2 w-[80px]">Qté</th>
              <th className="text-left p-2 w-[100px]">Unité</th>
              <th className="text-right p-2 w-[120px]">P.U. HT</th>
              <th className="text-right p-2 w-[80px]">TVA %</th>
              <th className="text-right p-2 w-[80px]">Remise %</th>
              <th className="text-right p-2 w-[120px]">Total HT</th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {serviceLines.map((line, index) => (
              <tr key={line.id} className="border-b hover:bg-muted/50">
                <td className="p-2">
                  <Input
                    value={line.label}
                    onChange={(e) => updateLine(index, { label: e.target.value })}
                    placeholder="Désignation"
                    disabled={disabled}
                    className="text-sm"
                  />
                  <Input
                    value={line.description || ""}
                    onChange={(e) => updateLine(index, { description: e.target.value })}
                    placeholder="Description (optionnelle)"
                    disabled={disabled}
                    className="text-xs mt-1"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={line.ref || ""}
                    onChange={(e) => updateLine(index, { ref: e.target.value })}
                    placeholder="Réf."
                    disabled={disabled}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(index, { qty: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    className="text-sm text-right"
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={line.unit}
                    onValueChange={(value) => updateLine(index, { unit: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <SelectTrigger className="text-sm">
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
                <td className="p-2">
                  <Input
                    type="number"
                    value={line.discountPct || 0}
                    onChange={(e) => updateLine(index, { discountPct: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={disabled}
                    className="text-sm text-right"
                  />
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

      {serviceLines.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucune prestation ajoutée. Cliquez sur "Ajouter une prestation" pour commencer.
        </div>
      )}
    </div>
  );
}
