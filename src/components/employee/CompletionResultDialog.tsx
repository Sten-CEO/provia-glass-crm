import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, XCircle, Calendar } from "lucide-react";

interface CompletionResultDialogProps {
  open: boolean;
  onResult: (result: "Terminée" | "Échouée" | "Reportée") => void;
}

export function CompletionResultDialog({ open, onResult }: CompletionResultDialogProps) {
  const [selected, setSelected] = useState<"Terminée" | "Échouée" | "Reportée">("Terminée");

  const handleConfirm = () => {
    onResult(selected);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Résultat de l'intervention</DialogTitle>
          <DialogDescription>
            Comment s'est passée l'intervention ?
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={(v: any) => setSelected(v)} className="space-y-3">
          <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="Terminée" id="terminee" />
            <Label htmlFor="terminee" className="flex items-center gap-2 cursor-pointer flex-1">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Terminée</div>
                <div className="text-sm text-muted-foreground">L'intervention s'est bien déroulée</div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="Échouée" id="echouee" />
            <Label htmlFor="echouee" className="flex items-center gap-2 cursor-pointer flex-1">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="font-medium">Échouée</div>
                <div className="text-sm text-muted-foreground">Problème technique ou matériel manquant</div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="Reportée" id="reportee" />
            <Label htmlFor="reportee" className="flex items-center gap-2 cursor-pointer flex-1">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <div className="font-medium">Reportée</div>
                <div className="text-sm text-muted-foreground">À reprogrammer plus tard</div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <Button onClick={handleConfirm} className="w-full">
          Confirmer
        </Button>
      </DialogContent>
    </Dialog>
  );
}
