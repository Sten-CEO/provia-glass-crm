import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MaterialAvailabilityWarning } from "./MaterialAvailabilityWarning";
import { toast } from "sonner";

interface MaterialLine {
  inventory_item_id?: string;
  name?: string;
  designation?: string;
  qty?: number;
  quantite?: number;
}

interface MaterialsAvailabilityCheckerProps {
  lines: MaterialLine[];
  scheduledStart: string | null; // ISO format or null
  scheduledEnd: string | null; // ISO format or null
  excludeReservationId?: string;
  onConflictDetected?: (hasConflict: boolean) => void;
}

interface ConflictInfo {
  materialId: string;
  materialName: string;
  qtyNeeded: number;
  qtyAvailable: number;
  qtyOnHand: number;
  qtyReservedOnSlot: number;
}

export const MaterialsAvailabilityChecker = ({
  lines,
  scheduledStart,
  scheduledEnd,
  excludeReservationId,
  onConflictDetected,
}: MaterialsAvailabilityCheckerProps) => {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [notificationsSent, setNotificationsSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkAvailability = async () => {
      if (!scheduledStart || !scheduledEnd || lines.length === 0) {
        setConflicts([]);
        onConflictDetected?.(false);
        return;
      }

      const detectedConflicts: ConflictInfo[] = [];

      for (const line of lines) {
        const materialId = line.inventory_item_id;
        const qty = line.qty || line.quantite || 0;
        
        if (!materialId || qty <= 0) continue;

        // Récupérer le type d'item pour vérifier si c'est un matériel
        const { data: item } = await supabase
          .from("inventory_items")
          .select("type, name")
          .eq("id", materialId)
          .single();

        if (!item || item.type !== "materiel") continue;

        // Vérifier la disponibilité sur ce créneau
        const { data: availabilityData, error } = await supabase.rpc(
          "check_material_availability",
          {
            p_material_id: materialId,
            p_qty_needed: qty,
            p_start: scheduledStart,
            p_end: scheduledEnd,
            p_exclude_reservation_id: excludeReservationId || null,
          }
        );

        if (error) {
          console.error("Error checking material availability:", error);
          continue;
        }

        if (availabilityData && availabilityData.length > 0) {
          const availability = availabilityData[0];
          
          if (!availability.is_available) {
            detectedConflicts.push({
              materialId,
              materialName: item.name,
              qtyNeeded: qty,
              qtyAvailable: availability.qty_available,
              qtyOnHand: availability.qty_on_hand,
              qtyReservedOnSlot: availability.qty_already_reserved,
            });

            // Créer une notification si c'est un nouveau conflit
            const conflictKey = `${materialId}-${scheduledStart}-${scheduledEnd}`;
            if (!notificationsSent.has(conflictKey)) {
              await createConflictNotification(
                item.name,
                scheduledStart,
                scheduledEnd,
                availability.qty_already_reserved,
                availability.qty_on_hand
              );
              setNotificationsSent(prev => new Set(prev).add(conflictKey));
            }
          }
        }
      }

      setConflicts(detectedConflicts);
      onConflictDetected?.(detectedConflicts.length > 0);
    };

    checkAvailability();
  }, [lines, scheduledStart, scheduledEnd, excludeReservationId]);

  const createConflictNotification = async (
    materialName: string,
    start: string,
    end: string,
    qtyReserved: number,
    qtyTotal: number
  ) => {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      const dateStr = startDate.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      
      const startTimeStr = startDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      const endTimeStr = endDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      await supabase.from("notifications").insert({
        kind: "material_conflict",
        title: "Conflit de matériel",
        message: `Le matériel "${materialName}" est sur-réservé pour le ${dateStr} de ${startTimeStr} à ${endTimeStr}. (${qtyReserved}/${qtyTotal} déjà réservé)`,
        level: "warning",
        link: "/inventaire/materiels",
      });

      toast.warning("Conflit de matériel détecté", {
        description: `${materialName} n'est pas disponible sur ce créneau`,
      });
    } catch (error) {
      console.error("Error creating conflict notification:", error);
    }
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <MaterialAvailabilityWarning
          key={conflict.materialId}
          materialName={conflict.materialName}
          qtyNeeded={conflict.qtyNeeded}
          qtyAvailable={conflict.qtyAvailable}
          qtyOnHand={conflict.qtyOnHand}
          qtyReservedOnSlot={conflict.qtyReservedOnSlot}
        />
      ))}
    </div>
  );
};
