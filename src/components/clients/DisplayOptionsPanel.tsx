import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Plus, X } from "lucide-react";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "number" | "date";
}

interface DisplayOptions {
  standardFields: {
    telephone: boolean;
    ville: boolean;
    adresse: boolean;
    tva: boolean;
    tags: boolean;
    statut: boolean;
    devis: boolean;
    factures: boolean;
    jobs: boolean;
    planning: boolean;
    activite: boolean;
  };
  customFields: CustomField[];
}

interface DisplayOptionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (options: DisplayOptions) => void;
  currentOptions: DisplayOptions;
}

export function DisplayOptionsPanel({ open, onOpenChange, onSave, currentOptions }: DisplayOptionsPanelProps) {
  const [options, setOptions] = useState<DisplayOptions>(currentOptions);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "date">("text");

  useEffect(() => {
    setOptions(currentOptions);
  }, [currentOptions]);

  const toggleStandardField = (field: keyof DisplayOptions["standardFields"]) => {
    setOptions({
      ...options,
      standardFields: {
        ...options.standardFields,
        [field]: !options.standardFields[field],
      },
    });
  };

  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    
    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      label: newFieldLabel,
      type: newFieldType,
    };

    setOptions({
      ...options,
      customFields: [...options.customFields, newField],
    });

    setNewFieldLabel("");
    setNewFieldType("text");
  };

  const removeCustomField = (id: string) => {
    setOptions({
      ...options,
      customFields: options.customFields.filter((f) => f.id !== id),
    });
  };

  const handleSave = () => {
    onSave(options);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Options d'affichage</SheetTitle>
          <SheetDescription>
            Personnalisez les colonnes visibles dans la liste des clients
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Standard Fields */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Champs standard
            </h3>
            <div className="space-y-3">
              {Object.entries(options.standardFields).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={value}
                    onCheckedChange={() => toggleStandardField(key as keyof DisplayOptions["standardFields"])}
                  />
                  <Label
                    htmlFor={key}
                    className="text-sm font-normal capitalize cursor-pointer"
                  >
                    {key === "tva" ? "TVA" : key}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Champs personnalisés
            </h3>
            
            {options.customFields.length > 0 && (
              <div className="space-y-2 mb-4">
                {options.customFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{field.label}</span>
                      <span className="text-xs text-muted-foreground">({field.type})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(field.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Input
                placeholder="Nom du champ"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
              />
              <Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="number">Nombre</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addCustomField} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un champ
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button onClick={handleSave} className="w-full">
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
