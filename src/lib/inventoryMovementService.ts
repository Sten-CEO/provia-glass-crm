import { supabase } from "@/integrations/supabase/client";
import { createInventoryMovement, updateItemStock } from "./inventoryMovements";

export interface PlannedMovementParams {
  itemId: string;
  qty: number;
  sourceType: "devis" | "intervention";
  sourceId: string;
  sourceNumber: string;
  scheduledAt: string; // ISO date
  note?: string;
}

/**
 * Create or update a planned movement for inventory
 */
export async function createPlannedOut(params: PlannedMovementParams): Promise<void> {
  const { itemId, qty, sourceType, sourceId, sourceNumber, scheduledAt, note } = params;

  // Check if a planned movement already exists for this source
  const { data: existing } = await supabase
    .from("inventory_movements")
    .select("id, qty")
    .eq("item_id", itemId)
    .eq("source", sourceType)
    .eq("ref_id", sourceId)
    .eq("status", "planned")
    .single();

  if (existing) {
    // Update existing planned movement
    await supabase
      .from("inventory_movements")
      .update({
        qty,
        scheduled_at: scheduledAt,
        note: note || `Sortie planifiée pour ${sourceType} ${sourceNumber}`,
      })
      .eq("id", existing.id);
  } else {
    // Create new planned movement
    await createInventoryMovement({
      item_id: itemId,
      type: "expected_out",
      qty,
      source: sourceType,
      ref_id: sourceId,
      ref_number: sourceNumber,
      note: note || `Sortie planifiée pour ${sourceType} ${sourceNumber}`,
      status: "planned",
      date: scheduledAt,
    });

    // Also update in the movement table
    const { data: movement } = await supabase
      .from("inventory_movements")
      .select("id")
      .eq("item_id", itemId)
      .eq("source", sourceType)
      .eq("ref_id", sourceId)
      .eq("status", "planned")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (movement) {
      await supabase
        .from("inventory_movements")
        .update({ scheduled_at: scheduledAt })
        .eq("id", movement.id);
    }
  }
}

/**
 * Convert planned movements to actual outputs
 */
export async function convertPlannedToOut(sourceId: string, sourceType: "devis" | "intervention"): Promise<void> {
  // Get all planned movements for this source
  const { data: plannedMovements } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("source", sourceType)
    .eq("ref_id", sourceId)
    .eq("status", "planned");

  if (!plannedMovements || plannedMovements.length === 0) return;

  for (const movement of plannedMovements) {
    // Mark planned movement as canceled
    await supabase
      .from("inventory_movements")
      .update({ status: "canceled" })
      .eq("id", movement.id);

    // Create actual output movement
    await createInventoryMovement({
      item_id: movement.item_id,
      type: "out",
      qty: movement.qty,
      source: sourceType,
      ref_id: sourceId,
      ref_number: movement.ref_number || "",
      note: `Sortie effective (conversion de mouvement planifié)`,
      status: "done",
      date: new Date().toISOString(),
    });

    // Update the last created movement with effective_at
    const { data: lastMovement } = await supabase
      .from("inventory_movements")
      .select("id")
      .eq("item_id", movement.item_id)
      .eq("source", sourceType)
      .eq("ref_id", sourceId)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastMovement) {
      await supabase
        .from("inventory_movements")
        .update({ effective_at: new Date().toISOString() })
        .eq("id", lastMovement.id);
    }

    // Update stock - use company_id from the movement
    await updateItemStock(movement.item_id, movement.company_id);
  }
}

/**
 * Cancel all planned movements for a source
 */
export async function cancelPlannedMovements(sourceId: string, sourceType: "devis" | "intervention"): Promise<void> {
  await supabase
    .from("inventory_movements")
    .update({ status: "canceled" })
    .eq("source", sourceType)
    .eq("ref_id", sourceId)
    .eq("status", "planned");
}

/**
 * Reschedule planned movements to a new date
 */
export async function reschedulePlannedMovements(
  sourceId: string,
  sourceType: "devis" | "intervention",
  newScheduledAt: string
): Promise<void> {
  await supabase
    .from("inventory_movements")
    .update({ scheduled_at: newScheduledAt })
    .eq("source", sourceType)
    .eq("ref_id", sourceId)
    .eq("status", "planned");
}

/**
 * Record a purchase receipt (inventory in)
 */
export async function receiveInventoryIn(itemId: string, qty: number, purchaseId: string, companyId: string, note?: string): Promise<void> {
  await createInventoryMovement({
    item_id: itemId,
    type: "in",
    qty,
    source: "achat",
    ref_id: purchaseId,
    note: note || "Réception d'achat",
    status: "done",
    date: new Date().toISOString(),
  });

  await updateItemStock(itemId, companyId);
}
