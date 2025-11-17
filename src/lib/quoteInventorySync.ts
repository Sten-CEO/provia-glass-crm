import { supabase } from "@/integrations/supabase/client";
import { createInventoryMovement } from "./inventoryMovements";

/**
 * Utilities to sync inventory reservations/consumption with quote lifecycle
 * - On quote accepted/validated/terminé/signé → reserve quantities from quote lines
 * - On quote refused/annulé → unreserve previously planned reservations
 * - When intervention linked to quote is completed → consume stock and release reservations
 *
 * Idempotent: we always compute the delta between existing planned reservations
 * for this quote and desired quantities from current quote lines.
 */
export async function syncQuoteInventoryStatus(
  quoteId: string,
  quoteNumber: string,
  newStatus: string,
  previousStatus: string | undefined,
  _lines?: any[]
) {
  try {
    const acceptedStatuses = ["Accepté", "Validé", "Terminé", "Signé"]; // treat all as reserving states
    const cancelledStatuses = ["Refusé", "Annulé"];

    if (!quoteId) return { success: true };

    // Load latest quote lines from DB to ensure we have inventory metadata (SKU/IDs)
    const lines = await fetchQuoteInventoryLines(quoteId);

    // Build desired quantities per item
    const desiredByItem = await aggregateDesiredReservations(lines);

    // Load existing planned reservations for this quote
    const existingByItem = await getExistingPlannedReservations(quoteId);

    // If quote is in an accepted-like status → enforce reservations idempotently
    if (acceptedStatuses.includes(newStatus)) {
      // Apply delta to qty_reserved per item
      for (const [itemId, desiredQty] of Object.entries(desiredByItem)) {
        const current = existingByItem[itemId] || 0;
        const delta = desiredQty - current;
        if (delta !== 0) {
          await adjustItemReserved(itemId, delta);
        }
      }

      // Cancel all existing planned reservations for this quote then recreate cleanly
      await supabase
        .from("inventory_movements")
        .update({ status: "canceled" })
        .eq("ref_id", quoteId)
        .eq("type", "reserve")
        .eq("status", "planned");

      // Insert new planned reservation movements
      const movements = Object.entries(desiredByItem).map(([itemId, qty]) => ({
        item_id: itemId,
        type: "reserve",
        qty,
        source: "devis",
        ref_id: quoteId,
        ref_number: quoteNumber,
        note: `Réservation pour devis ${quoteNumber}`,
        status: "planned",
        date: new Date().toISOString(),
      }));

      if (movements.length) {
        const { error } = await supabase.from("inventory_movements").insert(movements as any);
        if (error) throw error;
      }

      return { success: true, message: "Réservations mises à jour" };
    }

    // If moving into a canceled/refused state
    if (cancelledStatuses.includes(newStatus) && acceptedStatuses.includes(previousStatus || "")) {
      // Reduce reserved by what is currently planned for this quote
      for (const [itemId, qty] of Object.entries(existingByItem)) {
        if (qty && qty > 0) {
          await adjustItemReserved(itemId, -qty);
        }
      }

      // Cancel planned movements
      await supabase
        .from("inventory_movements")
        .update({ status: "canceled" })
        .eq("ref_id", quoteId)
        .eq("type", "reserve")
        .eq("status", "planned");

      return { success: true, message: "Réservations annulées" };
    }

    return { success: true, message: "Aucune action inventaire" };
  } catch (error) {
    console.error("Error syncing quote inventory:", error);
    throw error;
  }
}

/**
 * When an intervention linked to a quote is completed, consume stock and release reservations
 */
export async function consumeQuoteInventory(
  quoteId: string,
  interventionId: string,
  interventionNumber: string
) {
  try {
    const lines = await fetchQuoteInventoryLines(quoteId);
    const desiredByItem = await aggregateDesiredReservations(lines);

    // Cancel planned reservations for quote
    await supabase
      .from("inventory_movements")
      .update({ status: "canceled" })
      .eq("ref_id", quoteId)
      .eq("type", "reserve")
      .eq("status", "planned");

    // For each item: create consumption movement and update stock + reserved
    for (const [itemId, qty] of Object.entries(desiredByItem)) {
      // Fetch stock
      const { data: item } = await supabase
        .from("inventory_items")
        .select("qty_on_hand, qty_reserved")
        .eq("id", itemId)
        .single();

      if (!item) continue;

      await createInventoryMovement({
        item_id: itemId,
        type: "out",
        qty: Number(qty),
        source: "intervention",
        ref_id: interventionId,
        ref_number: interventionNumber,
        note: `Consommation intervention ${interventionNumber}`,
        status: "done",
      });

      await supabase
        .from("inventory_items")
        .update({
          qty_on_hand: Math.max(0, (item.qty_on_hand || 0) - Number(qty)),
          qty_reserved: Math.max(0, (item.qty_reserved || 0) - Number(qty)),
        })
        .eq("id", itemId);
    }

    return { success: true, message: "Stock consommé" };
  } catch (error) {
    console.error("Error consuming quote inventory:", error);
    throw error;
  }
}

// Helpers
async function fetchQuoteInventoryLines(quoteId: string) {
  const { data: quote, error } = await supabase
    .from("devis")
    .select("lignes, numero")
    .eq("id", quoteId)
    .single();
  if (error) throw error;
  return ((quote?.lignes as any[]) || []).filter(Boolean);
}

async function aggregateDesiredReservations(lines: any[]) {
  const map: Record<string, number> = {};
  for (const line of lines) {
    const qty = Number(line.qty ?? line.quantite ?? line.quantity ?? line.qte ?? 0);
    if (!qty || qty <= 0) continue;

    const itemId = await resolveItemIdFromLine(line);
    if (!itemId) continue;

    map[itemId] = (map[itemId] || 0) + qty;
  }
  return map;
}

async function resolveItemIdFromLine(line: any): Promise<string | null> {
  if (line.inventory_item_id) return line.inventory_item_id as string;

  const sku = line.sku || line.reference || line.product_ref || line.ref || null;
  if (sku) {
    const { data } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const name = line.name || line.designation || line.product_name || line.description || null;
  if (name) {
    const { data } = await supabase
      .from("inventory_items")
      .select("id")
      .ilike("name", `%${name}%`)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

async function getExistingPlannedReservations(quoteId: string) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("item_id, qty")
    .eq("ref_id", quoteId)
    .eq("type", "reserve")
    .eq("status", "planned");
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data || []) {
    if (!row.item_id) continue;
    map[row.item_id] = (map[row.item_id] || 0) + Number(row.qty || 0);
  }
  return map;
}

async function adjustItemReserved(itemId: string, delta: number) {
  if (delta === 0) return;
  const { data: item } = await supabase
    .from("inventory_items")
    .select("qty_reserved")
    .eq("id", itemId)
    .single();
  if (!item) return;
  await supabase
    .from("inventory_items")
    .update({ qty_reserved: Math.max(0, (item.qty_reserved || 0) + delta) })
    .eq("id", itemId);
}
