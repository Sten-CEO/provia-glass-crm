import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface BulkDeleteToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  onDelete: () => void;
  entityName: string;
  allSelected: boolean;
}

export const BulkDeleteToolbar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDelete,
  entityName,
  allSelected,
}: BulkDeleteToolbarProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          aria-label="Tout sélectionner"
        />
        <span className="text-sm text-muted-foreground">
          {selectedCount > 0
            ? `${selectedCount} élément${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`
            : `${totalCount} élément${totalCount > 1 ? "s" : ""} au total`}
        </span>
        
        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowConfirmDialog(true)}
            className="ml-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer la sélection ({selectedCount})
          </Button>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer les <strong>{selectedCount}</strong> {entityName}
              {selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""} ?
              <br />
              <span className="text-destructive font-medium">
                Cette action est irréversible.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
