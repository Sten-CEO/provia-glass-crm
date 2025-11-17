import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MaterialAvailability {
  isAvailable: boolean;
  qtyOnHand: number;
  qtyAlreadyReserved: number;
  qtyAvailable: number;
}

/**
 * Hook pour vérifier la disponibilité d'un matériel sur un créneau horaire donné
 */
export const useMaterialAvailability = (
  materialId: string | null,
  qtyNeeded: number,
  scheduledStart: string | null,
  scheduledEnd: string | null,
  excludeReservationId?: string
) => {
  const [availability, setAvailability] = useState<MaterialAvailability | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!materialId || !scheduledStart || !scheduledEnd || qtyNeeded <= 0) {
        setAvailability(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("check_material_availability", {
          p_material_id: materialId,
          p_qty_needed: qtyNeeded,
          p_start: scheduledStart,
          p_end: scheduledEnd,
          p_exclude_reservation_id: excludeReservationId || null,
        });

        if (error) {
          console.error("Error checking material availability:", error);
          setAvailability(null);
          return;
        }

        if (data && data.length > 0) {
          setAvailability({
            isAvailable: data[0].is_available,
            qtyOnHand: data[0].qty_on_hand,
            qtyAlreadyReserved: data[0].qty_already_reserved,
            qtyAvailable: data[0].qty_available,
          });
        }
      } catch (error) {
        console.error("Error in useMaterialAvailability:", error);
        setAvailability(null);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, [materialId, qtyNeeded, scheduledStart, scheduledEnd, excludeReservationId]);

  return { availability, loading };
};
