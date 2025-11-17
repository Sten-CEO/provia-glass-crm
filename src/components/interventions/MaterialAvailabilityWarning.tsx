import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MaterialAvailabilityWarningProps {
  materialName: string;
  qtyNeeded: number;
  qtyAvailable: number;
  qtyOnHand: number;
  qtyReservedOnSlot: number;
}

export const MaterialAvailabilityWarning = ({
  materialName,
  qtyNeeded,
  qtyAvailable,
  qtyOnHand,
  qtyReservedOnSlot,
}: MaterialAvailabilityWarningProps) => {
  if (qtyAvailable >= qtyNeeded) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-orange-500 bg-orange-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Matériel déjà réservé sur ce créneau</AlertTitle>
      <AlertDescription className="text-sm space-y-1">
        <p>
          <strong>{materialName}</strong> : {qtyReservedOnSlot}/{qtyOnHand} déjà réservé(s) sur ce créneau.
        </p>
        <p className="text-xs text-muted-foreground">
          Disponible : {qtyAvailable} • Demandé : {qtyNeeded}
        </p>
        <p className="text-xs font-medium mt-2">
          Vous pouvez continuer, mais ce matériel ne sera pas disponible.
        </p>
      </AlertDescription>
    </Alert>
  );
};
