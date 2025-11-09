import { useEffect, useRef } from "react";
import { reserveStock, unreserveStock } from "@/lib/stockUtils";
import { toast } from "sonner";

/**
 * Hook to automatically manage inventory reservations based on quote status
 */
export const useQuoteInventorySync = (
  quoteId: string | undefined,
  quoteNumber: string,
  status: string,
  previousStatus: string | undefined,
  inventoryLines: Array<{ item_id?: string; qty: number }>
) => {
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!quoteId || hasSynced.current) return;

    const syncInventory = async () => {
      try {
        // When quote becomes "Accepté" - reserve stock
        if (status === "Accepté" && previousStatus !== "Accepté") {
          for (const line of inventoryLines) {
            if (line.item_id && line.qty > 0) {
              await reserveStock(line.item_id, line.qty, quoteId, quoteNumber);
            }
          }
          toast.success("Stock réservé");
          hasSynced.current = true;
        }

        // When quote becomes "Refusé" or "Annulé" - unreserve stock
        if (
          (status === "Refusé" || status === "Annulé") &&
          (previousStatus === "Accepté" || previousStatus === "Envoyé")
        ) {
          for (const line of inventoryLines) {
            if (line.item_id && line.qty > 0) {
              await unreserveStock(line.item_id, line.qty, quoteId, quoteNumber);
            }
          }
          toast.success("Réservation annulée");
          hasSynced.current = true;
        }
      } catch (error) {
        console.error("Error syncing inventory:", error);
        toast.error("Erreur de synchronisation du stock");
      }
    };

    syncInventory();
  }, [quoteId, quoteNumber, status, previousStatus, inventoryLines]);
};
