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
  // IDEMPOTENCY CHECK: Skip if already processed (done "out" movements exist)
  const { data: existingDoneMovements } = await supabase
    .from("inventory_movements")
    .select("id")
    .eq("source", "intervention")
    .eq("ref_id", interventionId)
    .eq("status", "done")
    .eq("type", "out")
    .limit(1);

  if (existingDoneMovements && existingDoneMovements.length > 0) {
    console.log(`[completeInterventionStock] Already processed for ${interventionId}, skipping`);
    return;
  }

  // Get all consumables/materials for this intervention from intervention_consumables
  // This is the single source of truth for what was actually used
  const { data: items, error } = await supabase
    .from("intervention_consumables")
    .select("*")
    .eq("intervention_id", interventionId);

  if (error) {
    console.error("Error loading intervention items:", error);
    throw error;
  }

  if (!items || items.length === 0) return;

  // Cancel ALL planned movements for this intervention first (to prevent duplicates)
  await supabase
    .from("inventory_movements")
    .update({ status: "canceled" })
    .eq("source", "intervention")
    .eq("ref_id", interventionId)
    .eq("status", "planned");

  // Process each item from intervention_consumables (not from movements)
  for (const consumable of items) {
    if (!consumable.inventory_item_id) continue;

    // Get item type from inventory_items
    const { data: inventoryItem } = await supabase
      .from("inventory_items")
      .select("type")
      .eq("id", consumable.inventory_item_id)
      .single();

    if (!inventoryItem) continue;

    const isConsumable = inventoryItem.type === "consommable";

    if (isConsumable) {
      // CONSUMABLE: Convert planned to actual consumption - decrements stock
      await createInventoryMovement({
        item_id: consumable.inventory_item_id,
        type: "out",
        qty: consumable.quantity,
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `Consommation intervention ${interventionNumber}`,
        status: "done",
        date: new Date().toISOString(),
      });

      // Also decrement qty_reserved since the planned reservation is now consumed
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_reserved")
        .eq("id", consumable.inventory_item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_reserved: Math.max(0, (item.qty_reserved || 0) - consumable.quantity),
          })
          .eq("id", consumable.inventory_item_id);
      }
    } else {
      // MATERIAL: Just unreserve - NO stock movement needed
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_reserved")
        .eq("id", consumable.inventory_item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_reserved: Math.max(0, (item.qty_reserved || 0) - consumable.quantity),
          })
          .eq("id", consumable.inventory_item_id);
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
        .select("qty_reserved, company_id")
        .eq("id", movement.item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_reserved: Math.max(0, (item.qty_reserved || 0) - movement.qty),
          })
          .eq("id", movement.item_id);
        
        // Update stock calculations
        await updateItemStock(movement.item_id, item.company_id);
      }
    } else {
      // For other types, get company_id from item
      const { data: item } = await supabase
        .from("inventory_items")
        .select("company_id")
        .eq("id", movement.item_id)
        .single();
      
      if (item) {
        await updateItemStock(movement.item_id, item.company_id);
      }
    }
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
