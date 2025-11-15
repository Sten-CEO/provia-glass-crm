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

    const movements = inventoryLines.map((line) => ({
      item_id: line.inventory_item_id,
      type: "out",
      source: "devis",
      qty: -Math.abs(line.qty),
      ref_id: quoteId,
      ref_number: quoteNumber,
      note: `Prévu pour devis ${quoteNumber} - ${line.name}`,
      status: "planned",
      scheduled_at: plannedDate || new Date().toISOString(),
      date: new Date().toISOString(),
    }));

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
