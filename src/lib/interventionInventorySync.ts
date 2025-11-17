import { supabase } from "@/integrations/supabase/client";
import { createInventoryMovement } from "./inventoryMovements";

/**
 * Reserve inventory items when an intervention is planned
 */
export async function reserveInventoryForIntervention(
  interventionId: string,
  interventionNumber: string,
  scheduledDate: string,
  consumableIds: string[]
) {
  try {
    // Get consumables for this intervention
    const { data: consumables, error } = await supabase
      .from("intervention_consumables")
      .select("*")
      .eq("intervention_id", interventionId)
      .in("inventory_item_id", consumableIds.filter(id => id)); // Only items with inventory_item_id

    if (error) throw error;

    // Create planned reservations for each consumable
    for (const consumable of consumables || []) {
      if (!consumable.inventory_item_id) continue;

      await createInventoryMovement({
        item_id: consumable.inventory_item_id,
        type: "reserve",
        qty: consumable.quantity,
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `Réservation pour intervention ${interventionNumber}`,
        status: "planned",
        date: scheduledDate,
      });

      // Update reserved quantity
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_reserved")
        .eq("id", consumable.inventory_item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_reserved: (item.qty_reserved || 0) + consumable.quantity
          })
          .eq("id", consumable.inventory_item_id);
      }
    }
  } catch (error) {
    console.error("Error reserving inventory:", error);
    throw error;
  }
}

/**
 * Convert planned reservations to actual consumption when intervention is completed
 */
export async function consumeReservedInventory(
  interventionId: string,
  interventionNumber: string
) {
  try {
    // First, check if this intervention is linked to a quote
    const { data: intervention } = await supabase
      .from("jobs")
      .select("quote_id, converted_from_quote_id")
      .eq("id", interventionId)
      .single();

    const linkedQuoteId = intervention?.quote_id || intervention?.converted_from_quote_id;

    // If linked to quote, use quote inventory consumption
    if (linkedQuoteId) {
      const { consumeQuoteInventory } = await import("./quoteInventorySync");
      await consumeQuoteInventory(linkedQuoteId, interventionId, interventionNumber);
      return;
    }

    // Otherwise, consume intervention consumables normally
    const { data: consumables, error } = await supabase
      .from("intervention_consumables")
      .select("*")
      .eq("intervention_id", interventionId);

    if (error) throw error;

    // Cancel planned reservations (both reserve and out types)
    await supabase
      .from("inventory_movements")
      .update({ status: "canceled" })
      .eq("ref_id", interventionId)
      .eq("status", "planned")
      .in("type", ["reserve", "out"]);

    // Create actual consumption movements
    for (const consumable of consumables || []) {
      if (!consumable.inventory_item_id) continue;

      // Create consumption movement
      await createInventoryMovement({
        item_id: consumable.inventory_item_id,
        type: "out",
        qty: consumable.quantity,
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `Consommation intervention ${interventionNumber}`,
        status: "done",
      });

      // Update stock quantities
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_on_hand, qty_reserved")
        .eq("id", consumable.inventory_item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_on_hand: Math.max(0, item.qty_on_hand - consumable.quantity),
            qty_reserved: Math.max(0, item.qty_reserved - consumable.quantity)
          })
          .eq("id", consumable.inventory_item_id);
      }
    }
  } catch (error) {
    console.error("Error consuming inventory:", error);
    throw error;
  }
}

/**
 * Cancel inventory reservations when intervention is canceled
 */
export async function cancelInventoryReservations(interventionId: string) {
  try {
    // Get all planned reservations for this intervention (both reserve and out types)
    const { data: movements, error } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("ref_id", interventionId)
      .eq("status", "planned")
      .in("type", ["reserve", "out"]);

    if (error) throw error;

    // Cancel each reservation and update quantities
    for (const movement of movements || []) {
      await supabase
        .from("inventory_movements")
        .update({ status: "canceled" })
        .eq("id", movement.id);

      // Update reserved quantity
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_reserved")
        .eq("id", movement.item_id)
        .single();

      if (item) {
        await supabase
          .from("inventory_items")
          .update({
            qty_reserved: Math.max(0, item.qty_reserved - movement.qty)
          })
          .eq("id", movement.item_id);
      }
    }
  } catch (error) {
    console.error("Error canceling reservations:", error);
    throw error;
  }
}

/**
 * Update reservation dates when intervention is rescheduled
 */
export async function rescheduleInventoryReservations(
  interventionId: string,
  newScheduledDate: string
) {
  try {
    await supabase
      .from("inventory_movements")
      .update({ scheduled_at: newScheduledDate })
      .eq("ref_id", interventionId)
      .eq("status", "planned")
      .in("type", ["reserve", "out"]);
  } catch (error) {
    console.error("Error rescheduling reservations:", error);
    throw error;
  }
}
