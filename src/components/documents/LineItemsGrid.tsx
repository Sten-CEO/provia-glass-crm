import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentLine } from "@/types/documents";
import { calculateLineTotal } from "@/lib/documentCalculations";
import { DOCUMENT_UNITS, VAT_RATES } from "@/types/documents";
import { formatCurrency } from "@/lib/documentCalculations";

interface LineItemsGridProps {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  disabled?: boolean;
}

export function LineItemsGrid({ lines, onChange, disabled }: LineItemsGridProps) {
  function addLine() {
    const newLine: DocumentLine = {
      id: crypto.randomUUID(),
      label: "",
      qty: 1,
      unit: "unité",
      unitPriceHT: 0,
      vatRate: 20,
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0,
    };
    onChange([...lines, newLine]);
  }

  function updateLine(index: number, updates: Partial<DocumentLine>) {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };

    // Recalculate totals
    const totals = calculateLineTotal(updated[index]);
    updated[index] = { ...updated[index], ...totals };

    onChange(updated);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  function duplicateLine(index: number) {
    const duplicate = { ...lines[index], id: crypto.randomUUID() };
    const updated = [...lines];
    updated.splice(index + 1, 0, duplicate);
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 text-sm font-medium">Réf</th>
              <th className="text-left p-2 text-sm font-medium min-w-[200px]">Désignation</th>
              <th className="text-right p-2 text-sm font-medium w-20">Qté</th>
              <th className="text-left p-2 text-sm font-medium w-24">Unité</th>
              <th className="text-right p-2 text-sm font-medium w-28">PU HT</th>
              <th className="text-right p-2 text-sm font-medium w-20">TVA</th>
              <th className="text-right p-2 text-sm font-medium w-24">Remise %</th>
              <th className="text-right p-2 text-sm font-medium w-28">Total HT</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="border-b hover:bg-muted/50">
                <td className="p-2">
                  <Input
                    value={line.ref || ""}
                    onChange={(e) => updateLine(index, { ref: e.target.value })}
                    placeholder="Réf"
                    className="h-8 text-sm"
                    disabled={disabled}
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={line.label}
                    onChange={(e) => updateLine(index, { label: e.target.value })}
                    placeholder="Désignation"
                    className="h-8 text-sm"
                    disabled={disabled}
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(index, { qty: Number(e.target.value) })}
                    className="h-8 text-sm text-right"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={line.unit}
                    onValueChange={(value) => updateLine(index, { unit: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-sm">
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
                    onChange={(e) => updateLine(index, { unitPriceHT: Number(e.target.value) })}
                    className="h-8 text-sm text-right"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={String(line.vatRate)}
                    onValueChange={(value) => updateLine(index, { vatRate: Number(value) })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-sm">
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
                    onChange={(e) => updateLine(index, { discountPct: Number(e.target.value) })}
                    className="h-8 text-sm text-right"
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={disabled}
                  />
                </td>
                <td className="p-2 text-right text-sm font-medium">
                  {formatCurrency(line.totalHT)}
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => duplicateLine(index)}
                      disabled={disabled}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeLine(index)}
                      disabled={disabled || lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        variant="outline"
        onClick={addLine}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une ligne
      </Button>
    </div>
  );
}
