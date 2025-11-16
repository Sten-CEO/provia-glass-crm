import { supabase } from "@/integrations/supabase/client";

/**
 * Create or update planned inventory movements for a quote
 */
export async function syncQuoteInventoryPlanning(
  quoteId: string,
  quoteNumber: string,
  lines: any[],
  plannedDate?: string
) {
  try {
    // Cancel existing planned movements for this quote
    await supabase
      .from("inventory_movements")
      .update({ status: "canceled" })
      .eq("ref_id", quoteId)
      .eq("status", "planned");

    // Create new planned movements for inventory items
    const inventoryLines = lines.filter(
      (line) => line.inventory_item_id && line.qty > 0
    );

    if (inventoryLines.length === 0) {
      return { movementsCount: 0 };
    }

    const movements = inventoryLines
      .map((line) => {
        const normalizedType = (line.type || "").toString().toLowerCase();
        if (normalizedType === "service") return null;
        const isConsumable = normalizedType === "consumable";
        const isMaterial = normalizedType === "material";
        const movementType = isMaterial ? "reserve" : "expected_out"; // default to expected_out
        const qty = Math.abs(line.qty || 0);
        if (!qty) return null;
        const label = line.name || line.label || "";
        const notePrefix = isMaterial ? "Réservation (matériel)" : "À prévoir (consommable)";
        return {
          item_id: line.inventory_item_id,
          type: movementType,
          source: "devis",
          qty,
          ref_id: quoteId,
          ref_number: quoteNumber,
          note: `${notePrefix} pour devis ${quoteNumber}${label ? ` - ${label}` : ""}`,
          status: "planned",
          scheduled_at: plannedDate || new Date().toISOString(),
          date: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    const { error } = await supabase
      .from("inventory_movements")
      .insert(movements);

    if (error) {
      console.error("Error creating planned movements:", error);
      throw error;
    }

    return { movementsCount: movements.length };
  } catch (error) {
    console.error("Error syncing quote inventory planning:", error);
    throw error;
  }
}

/**
 * Cancel all planned inventory movements for a quote
 */
export async function cancelQuotePlannedMovements(quoteId: string) {
  try {
    const { error } = await supabase
      .from("inventory_movements")
      .update({ status: "canceled" })
      .eq("ref_id", quoteId)
      .eq("status", "planned");

    if (error) throw error;
  } catch (error) {
    console.error("Error canceling quote planned movements:", error);
    throw error;
  }
}
