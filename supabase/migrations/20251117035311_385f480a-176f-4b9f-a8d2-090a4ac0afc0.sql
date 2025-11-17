-- Create unique index for per-quote reservations (must commit before function uses it)
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_reservations_quote_item
  ON public.inventory_reservations(quote_id, inventory_item_id)
  WHERE quote_id IS NOT NULL AND inventory_item_id IS NOT NULL;