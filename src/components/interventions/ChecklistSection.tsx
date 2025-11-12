import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
}

interface ChecklistSectionProps {
  interventionId?: string;
  checklist: ChecklistItem[];
  onChange: (checklist: ChecklistItem[]) => void;
}

export function ChecklistSection({ interventionId, checklist = [], onChange }: ChecklistSectionProps) {
  const [newItemLabel, setNewItemLabel] = useState("");

  const addItem = () => {
    if (!newItemLabel.trim()) {
      toast.error("Le libellé est requis");
      return;
    }

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      label: newItemLabel.trim(),
      required: false,
      completed: false,
    };

    onChange([...checklist, newItem]);
    setNewItemLabel("");
  };

  const removeItem = (id: string) => {
    onChange(checklist.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    onChange(
      checklist.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const saveChecklist = async () => {
    if (!interventionId) {
      toast.error("Intervention non enregistrée");
      return;
    }

    try {
      const { error } = await supabase
        .from("jobs")
        .update({ checklist: checklist as any })
        .eq("id", interventionId);

      if (error) throw error;
      toast.success("Checklist enregistrée");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle>Checklist d'intervention (optionnelle)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Liste des items */}
        {checklist.length > 0 && (
          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    placeholder="Libellé de la tâche"
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={item.required}
                        onCheckedChange={(checked) => 
                          updateItem(item.id, { required: checked as boolean })
                        }
                      />
                      <span>Obligatoire</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => 
                          updateItem(item.id, { completed: checked as boolean })
                        }
                      />
                      <span>Complété</span>
                    </label>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un item */}
        <div className="flex gap-2">
          <Input
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            placeholder="Nouvelle tâche..."
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button onClick={addItem} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Enregistrer */}
        {interventionId && checklist.length > 0 && (
          <Button onClick={saveChecklist} className="w-full">
            Enregistrer la checklist
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
