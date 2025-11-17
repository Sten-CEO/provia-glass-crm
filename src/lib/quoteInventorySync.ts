import { supabase } from "@/integrations/supabase/client";
import { createInventoryMovement } from "./inventoryMovements";

/**
 * Synchronize inventory when quote status changes
 * Reserves items when quote is accepted/validated
 * Unreserves items when quote is refused/cancelled
 */
export async function syncQuoteInventoryStatus(
  quoteId: string,
  quoteNumber: string,
  newStatus: string,
  previousStatus: string,
  lines: any[]
) {
  try {
    const acceptedStatuses = ["Accepté", "Validé", "Terminé", "Signé"];
    const cancelledStatuses = ["Refusé", "Annulé"];

    // Get inventory lines only (consumables and materials)
    const inventoryLines = lines.filter(
      (line) => line.inventory_item_id && line.qty > 0
    );

    if (inventoryLines.length === 0) {
      return { success: true, message: "No inventory items in quote" };
    }

    // Quote accepted → Reserve stock
    if (
      acceptedStatuses.includes(newStatus) &&
      !acceptedStatuses.includes(previousStatus)
    ) {
      for (const line of inventoryLines) {
        await reserveStockForQuote(
          line.inventory_item_id,
          line.qty,
          quoteId,
          quoteNumber
        );
      }
      return { success: true, message: "Stock reserved" };
    }

    // Quote cancelled → Unreserve stock
    if (
      cancelledStatuses.includes(newStatus) &&
      acceptedStatuses.includes(previousStatus)
    ) {
      for (const line of inventoryLines) {
        await unreserveStockForQuote(
          line.inventory_item_id,
          line.qty,
          quoteId,
          quoteNumber
        );
      }
      return { success: true, message: "Stock unreserved" };
    }

    return { success: true, message: "No inventory action needed" };
  } catch (error) {
    console.error("Error syncing quote inventory:", error);
    throw error;
  }
}

/**
 * Reserve stock when quote is accepted
 */
async function reserveStockForQuote(
  itemId: string,
  qty: number,
  quoteId: string,
  quoteNumber: string
) {
  // Get current stock info
  const { data: item } = await supabase
    .from("inventory_items")
    .select("qty_on_hand, qty_reserved, name")
    .eq("id", itemId)
    .single();

  if (!item) {
    throw new Error(`Inventory item ${itemId} not found`);
  }

  const available = item.qty_on_hand - item.qty_reserved;
  if (available < qty) {
    throw new Error(
      `Stock insuffisant pour ${item.name}. Disponible: ${available}, Demandé: ${qty}`
    );
  }

  // Create reservation movement
  await createInventoryMovement({
    item_id: itemId,
    type: "reserve",
    qty: qty,
    source: "devis",
    ref_id: quoteId,
    ref_number: quoteNumber,
    note: `Réservation pour devis ${quoteNumber}`,
    status: "planned",
  });

  // Update reserved quantity
  await supabase
    .from("inventory_items")
    .update({
      qty_reserved: item.qty_reserved + qty,
    })
    .eq("id", itemId);
}

/**
 * Unreserve stock when quote is cancelled
 */
async function unreserveStockForQuote(
  itemId: string,
  qty: number,
  quoteId: string,
  quoteNumber: string
) {
  // Get current stock info
  const { data: item } = await supabase
    .from("inventory_items")
    .select("qty_reserved")
    .eq("id", itemId)
    .single();

  if (!item) return;

  // Cancel planned movements
  await supabase
    .from("inventory_movements")
    .update({ status: "canceled" })
    .eq("ref_id", quoteId)
    .eq("status", "planned")
    .eq("type", "reserve");

  // Update reserved quantity
  await supabase
    .from("inventory_items")
    .update({
      qty_reserved: Math.max(0, item.qty_reserved - qty),
    })
    .eq("id", itemId);
}

/**
 * Consume stock when intervention is completed
 * This is called when an intervention linked to a quote is marked as completed
 */
export async function consumeQuoteInventory(
  quoteId: string,
  interventionId: string,
  interventionNumber: string
) {
  try {
    // Get quote lines with inventory items
    const { data: quote } = await supabase
      .from("devis")
      .select("lignes, numero")
      .eq("id", quoteId)
      .single();

    if (!quote) return;

    const lines = (quote.lignes as any[]) || [];
    const inventoryLines = lines.filter(
      (line) => line.inventory_item_id && line.qty > 0
    );

    for (const line of inventoryLines) {
      await consumeStockFromQuote(
        line.inventory_item_id,
        line.qty,
        quoteId,
        quote.numero,
        interventionId,
        interventionNumber
      );
    }

    return { success: true, message: "Stock consumed" };
  } catch (error) {
    console.error("Error consuming quote inventory:", error);
    throw error;
  }
}

/**
 * Consume individual item stock
 */
async function consumeStockFromQuote(
  itemId: string,
  qty: number,
  quoteId: string,
  quoteNumber: string,
  interventionId: string,
  interventionNumber: string
) {
  // Get current stock info
  const { data: item } = await supabase
    .from("inventory_items")
    .select("qty_on_hand, qty_reserved")
    .eq("id", itemId)
    .single();

  if (!item) return;

  // Cancel planned reservation movements
  await supabase
    .from("inventory_movements")
    .update({ status: "canceled" })
    .eq("ref_id", quoteId)
    .eq("status", "planned")
    .eq("type", "reserve");

  // Create consumption movement
  await createInventoryMovement({
    item_id: itemId,
    type: "out",
    qty: qty,
    source: "intervention",
    ref_id: interventionId,
    ref_number: interventionNumber,
    note: `Consommation intervention ${interventionNumber} (devis ${quoteNumber})`,
    status: "done",
  });

  // Update stock quantities
  await supabase
    .from("inventory_items")
    .update({
      qty_on_hand: Math.max(0, item.qty_on_hand - qty),
      qty_reserved: Math.max(0, item.qty_reserved - qty),
    })
    .eq("id", itemId);
}
