import { supabase } from "@/integrations/supabase/client";
import { createInventoryMovement } from "./inventoryMovements";

/**
 * Stock management utilities for handling reservations and availability
 */

export interface StockInfo {
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
}

/**
 * Get stock information for an item
 */
export const getStockInfo = async (itemId: string): Promise<StockInfo> => {
  const { data: item } = await supabase
    .from("inventory_items")
    .select("qty_on_hand, qty_reserved")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { qty_on_hand: 0, qty_reserved: 0, qty_available: 0 };
  }

  return {
    qty_on_hand: item.qty_on_hand || 0,
    qty_reserved: item.qty_reserved || 0,
    qty_available: (item.qty_on_hand || 0) - (item.qty_reserved || 0),
  };
};

/**
 * Reserve stock for a quote
 */
export const reserveStock = async (
  itemId: string,
  qty: number,
  quoteId: string,
  quoteNumber: string
): Promise<void> => {
  const stock = await getStockInfo(itemId);

  if (stock.qty_available < qty) {
    throw new Error("Stock insuffisant pour réserver");
  }

  // Create reservation movement
  await createInventoryMovement({
    item_id: itemId,
    type: "reserve",
    qty,
    source: "devis",
    ref_id: quoteId,
    ref_number: quoteNumber,
    note: `Réservation pour devis ${quoteNumber}`,
    status: "done",
  });

  // Update reserved quantity
  await supabase
    .from("inventory_items")
    .update({ qty_reserved: stock.qty_reserved + qty })
    .eq("id", itemId);
};

/**
 * Unreserve stock (e.g., when quote is refused)
 */
export const unreserveStock = async (
  itemId: string,
  qty: number,
  quoteId: string,
  quoteNumber: string
): Promise<void> => {
  const stock = await getStockInfo(itemId);

  // Create unreservation movement (using 'out' with negative reserved impact)
  await createInventoryMovement({
    item_id: itemId,
    type: "reserve",
    qty: -qty,
    source: "devis",
    ref_id: quoteId,
    ref_number: quoteNumber,
    note: `Annulation réservation devis ${quoteNumber}`,
    status: "canceled",
  });

  // Update reserved quantity
  const newReserved = Math.max(0, stock.qty_reserved - qty);
  await supabase
    .from("inventory_items")
    .update({ qty_reserved: newReserved })
    .eq("id", itemId);
};

/**
 * Convert reservation to actual consumption (e.g., when intervention is completed)
 */
export const consumeReservedStock = async (
  itemId: string,
  qty: number,
  jobId: string,
  jobTitle: string
): Promise<void> => {
  const stock = await getStockInfo(itemId);

  // Create consumption movement (out)
  await createInventoryMovement({
    item_id: itemId,
    type: "out",
    qty,
    source: "intervention",
    ref_id: jobId,
    ref_number: jobTitle,
    note: `Consommation intervention ${jobTitle}`,
    status: "done",
  });

  // Update both on_hand and reserved
  await supabase
    .from("inventory_items")
    .update({
      qty_on_hand: Math.max(0, stock.qty_on_hand - qty),
      qty_reserved: Math.max(0, stock.qty_reserved - qty),
    })
    .eq("id", itemId);
};

/**
 * Check if enough stock is available (considering reservations)
 */
export const isStockAvailable = async (
  itemId: string,
  requiredQty: number
): Promise<boolean> => {
  const stock = await getStockInfo(itemId);
  return stock.qty_available >= requiredQty;
};
