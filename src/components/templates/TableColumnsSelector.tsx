import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

interface TableColumn {
  key: string;
  label: string;
  description?: string;
}

const AVAILABLE_COLUMNS: TableColumn[] = [
  { key: "reference", label: "Référence", description: "Référence du produit/service" },
  { key: "description", label: "Description", description: "Description détaillée" },
  { key: "quantity", label: "Quantité", description: "Quantité commandée" },
  { key: "days", label: "Nombre de jours", description: "Durée en jours (pour services)" },
  { key: "unit", label: "Unité", description: "Unité de mesure (m², h, pce...)" },
  { key: "unit_price_ht", label: "Prix unitaire HT", description: "Prix unitaire hors taxes" },
  { key: "vat_rate", label: "Taux de TVA", description: "Taux de TVA en %" },
  { key: "discount", label: "Remise", description: "Remise appliquée" },
  { key: "total_ht", label: "Total HT", description: "Total hors taxes" },
  { key: "total_ttc", label: "Total TTC", description: "Total toutes taxes comprises" },
];

interface TableColumnsSelectorProps {
  value: Record<string, boolean>;
  onChange: (columns: Record<string, boolean>) => void;
}

export function TableColumnsSelector({ value, onChange }: TableColumnsSelectorProps) {
  const handleToggle = (key: string, checked: boolean) => {
    onChange({
      ...value,
      [key]: checked,
    });
  };

  return (
    <Card className="p-4">
      <div className="mb-4">
        <Label className="text-base font-semibold">Colonnes du tableau</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Sélectionnez les colonnes à afficher dans les tableaux de lignes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AVAILABLE_COLUMNS.map((column) => (
          <div
            key={column.key}
            className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              id={`column-${column.key}`}
              checked={value[column.key] ?? false}
              onCheckedChange={(checked) => handleToggle(column.key, checked as boolean)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label
                htmlFor={`column-${column.key}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {column.label}
              </label>
              {column.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {column.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 Les colonnes Description et Quantité sont recommandées pour la lisibilité du document.
        </p>
      </div>
    </Card>
  );
}
