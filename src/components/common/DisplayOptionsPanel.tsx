import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import { DisplaySettings } from "@/hooks/useDisplaySettings";

interface DisplayOptionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DisplaySettings;
  availableColumns: Array<{ key: string; label: string }>;
  onToggleColumn: (column: string) => void;
  onSaveView: (name: string, columns: string[]) => void;
  onDeleteView: (name: string) => void;
  onApplyView: (viewName: string) => void;
}

export function DisplayOptionsPanel({
  open,
  onOpenChange,
  settings,
  availableColumns,
  onToggleColumn,
  onSaveView,
  onDeleteView,
  onApplyView,
}: DisplayOptionsPanelProps) {
  const [newViewName, setNewViewName] = useState("");
  const [selectedView, setSelectedView] = useState(settings.activeView);

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) return;
    onSaveView(newViewName, settings.visibleColumns);
    setNewViewName("");
  };

  const handleApplyView = (viewName: string) => {
    setSelectedView(viewName);
    onApplyView(viewName);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Options d'affichage</SheetTitle>
          <SheetDescription>
            Personnalisez les colonnes visibles et créez des vues personnalisées
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Vues personnalisées */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Vues disponibles
            </h3>
            <Select value={selectedView} onValueChange={handleApplyView}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une vue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Vue par défaut</SelectItem>
                {settings.customViews.map((view) => (
                  <SelectItem key={view.name} value={view.name}>
                    {view.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedView !== "default" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  onDeleteView(selectedView);
                  setSelectedView("default");
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer cette vue
              </Button>
            )}
          </div>

          {/* Colonnes disponibles */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Colonnes affichées
            </h3>
            <div className="space-y-3">
              {availableColumns.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={settings.visibleColumns.includes(column.key)}
                    onCheckedChange={() => onToggleColumn(column.key)}
                  />
                  <Label
                    htmlFor={column.key}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sauvegarder comme nouvelle vue */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Sauvegarder la configuration actuelle
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="Nom de la vue..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
              />
              <Button onClick={handleSaveCurrentView} size="icon">
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
