import { supabase } from "@/integrations/supabase/client";
import { createInventoryMovement, updateItemStock } from "./inventoryMovements";

/**
 * Service for managing intervention-related stock movements
 * Differentiates between consumables (deducted) and materials (reserved/returned)
 */

export interface InterventionItem {
  id: string;
  inventory_item_id: string;
  quantity: number;
  item_type?: "consumable" | "material";
}

/**
 * Process stock when intervention is completed
 * - Consumables: convert planned → actual consumption (decrement stock)
 * - Materials: unreserve and mark as returned (no stock change)
 */
export async function completeInterventionStock(
  interventionId: string,
  interventionNumber: string
): Promise<void> {
  // Get all consumables/materials for this intervention
  const { data: items, error } = await supabase
    .from("intervention_consumables")
    .select("*")
    .eq("intervention_id", interventionId);

  if (error) {
    console.error("Error loading intervention items:", error);
    throw error;
  }

  if (!items || items.length === 0) return;

  // Get planned movements for this intervention
  const { data: plannedMovements } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("source", "intervention")
    .eq("ref_id", interventionId)
    .eq("status", "planned");

  if (!plannedMovements || plannedMovements.length === 0) return;

  for (const movement of plannedMovements) {
    // Get item type from inventory_items
    const { data: item } = await supabase
      .from("inventory_items")
      .select("type")
      .eq("id", movement.item_id)
      .single();

    const isConsumable = item?.type === "consommable";

    // Mark planned movement as canceled
    await supabase
      .from("inventory_movements")
      .update({ status: "canceled" })
      .eq("id", movement.id);

    if (isConsumable) {
      // CONSUMABLE: Convert planned to actual consumption - decrements stock
      await createInventoryMovement({
        item_id: movement.item_id,
        type: "out",
        qty: movement.qty,
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `Consommation intervention ${interventionNumber}`,
        status: "done",
        date: new Date().toISOString(),
      });

      // Decrement stock
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_on_hand")
        .eq("id", movement.item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_on_hand: Math.max(0, (item.qty_on_hand || 0) - movement.qty),
          })
          .eq("id", movement.item_id);
      }
    } else {
      // MATERIAL: Create return/release movement - unreserve only, NO stock deduction
      await createInventoryMovement({
        item_id: movement.item_id,
        type: "in", // Return/release
        qty: movement.qty,
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `Restitution matériel intervention ${interventionNumber}`,
        status: "done",
        date: new Date().toISOString(),
      });

      // Unreserve the material (no stock change)
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_reserved")
        .eq("id", movement.item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_reserved: Math.max(0, (item.qty_reserved || 0) - movement.qty),
          })
          .eq("id", movement.item_id);
      }
    }
  }
}

/**
 * Cancel all stock reservations when intervention is canceled
 */
export async function cancelInterventionStock(
  interventionId: string,
  interventionNumber: string
): Promise<void> {
  // Get all planned movements for this intervention
  const { data: plannedMovements } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("source", "intervention")
    .eq("ref_id", interventionId)
    .eq("status", "planned");

  if (!plannedMovements || plannedMovements.length === 0) return;

  for (const movement of plannedMovements) {
    // Cancel the planned movement
    await supabase
      .from("inventory_movements")
      .update({ 
        status: "canceled",
        note: `${movement.note || ""} - Intervention annulée`
      })
      .eq("id", movement.id);

    // If it was a reservation (material), unreserve
    if (movement.type === "reserve") {
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_reserved")
        .eq("id", movement.item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_reserved: Math.max(0, (item.qty_reserved || 0) - movement.qty),
          })
          .eq("id", movement.item_id);
      }
    }

    // Update stock calculations
    await updateItemStock(movement.item_id);
  }
}

/**
 * Reschedule stock movements when intervention date changes
 */
export async function rescheduleInterventionStock(
  interventionId: string,
  newDate: string
): Promise<void> {
  await supabase
    .from("inventory_movements")
    .update({ scheduled_at: newDate })
    .eq("source", "intervention")
    .eq("ref_id", interventionId)
    .eq("status", "planned");
}
