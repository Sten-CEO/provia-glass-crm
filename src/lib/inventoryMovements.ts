import { supabase } from "@/integrations/supabase/client";

export interface CreateMovementParams {
  item_id: string;
  type: "in" | "out" | "reserve" | "expected_out";
  qty: number;
  source: "achat" | "devis" | "intervention" | "manuel";
  ref_id?: string;
  ref_number?: string;
  note?: string;
  status?: "done" | "planned" | "canceled";
  date?: string;
}

export async function createInventoryMovement(params: CreateMovementParams) {
  const {
    item_id,
    type,
    qty,
    source,
    ref_id,
    ref_number,
    note,
    status = "done",
    date = new Date().toISOString(),
  } = params;

  // Create movement
  const { data: movement, error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      item_id,
      type,
      qty,
      source,
      ref_id,
      ref_number,
      note,
      status,
      date,
    })
    .select()
    .single();

  if (movementError) throw movementError;

  // Update stock if movement is done
  if (status === "done") {
    await updateItemStock(item_id);
  }

  return movement;
}

export async function updateItemStock(item_id: string) {
  // Get all done movements for this item
  const { data: movements, error } = await supabase
    .from("inventory_movements")
    .select("type, qty, status")
    .eq("item_id", item_id)
    .eq("status", "done");

  if (error) throw error;

  // Calculate stock: entries (+) minus exits (-)
  const stock = movements.reduce((total, m) => {
    if (m.type === "in") return total + Number(m.qty);
    if (m.type === "out") return total - Number(m.qty);
    return total;
  }, 0);

  // Calculate reserved from planned movements
  const { data: plannedMovements } = await supabase
    .from("inventory_movements")
    .select("type, qty")
    .eq("item_id", item_id)
    .eq("status", "planned");

  const reserved = (plannedMovements || []).reduce((total, m) => {
    if (m.type === "reserve" || m.type === "expected_out") {
      return total + Number(m.qty);
    }
    return total;
  }, 0);

  // Update item
  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({
      qty_on_hand: stock,
      qty_reserved: reserved,
    })
    .eq("id", item_id);

  if (updateError) throw updateError;

  return { stock, reserved };
}

export async function cancelMovement(movement_id: string) {
  const { data: movement, error: fetchError } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("id", movement_id)
    .single();

  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from("inventory_movements")
    .update({ status: "canceled" })
    .eq("id", movement_id);

  if (updateError) throw updateError;

  // Update stock if was done
  if (movement.status === "done") {
    await updateItemStock(movement.item_id);
  }

  return movement;
}

export async function convertPlannedToReal(ref_id: string, ref_number: string) {
  // Get planned movements for this reference
  const { data: planned, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("ref_id", ref_id)
    .eq("status", "planned");

  if (error) throw error;

  // Convert each planned movement to a real exit
  for (const movement of planned || []) {
    // Mark planned as canceled
    await supabase
      .from("inventory_movements")
      .update({ status: "canceled" })
      .eq("id", movement.id);

    // Create real exit
    await createInventoryMovement({
      item_id: movement.item_id,
      type: "out",
      qty: movement.qty,
      source: movement.source as "achat" | "devis" | "intervention" | "manuel",
      ref_id,
      ref_number,
      note: `Conversion de prévision (${movement.ref_number})`,
      status: "done",
    });
  }
}
