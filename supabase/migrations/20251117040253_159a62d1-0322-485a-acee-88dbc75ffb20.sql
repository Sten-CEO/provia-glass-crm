-- Ensure unique constraint required by ON CONFLICT (quote_id, inventory_item_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_reservations_quote_item_key'
  ) THEN
    ALTER TABLE public.inventory_reservations
    ADD CONSTRAINT inventory_reservations_quote_item_key
    UNIQUE (quote_id, inventory_item_id);
  END IF;
END $$;

-- Attach trigger to keep reservations in sync when a quote status or lines change
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_update_reservations_for_quote'
  ) THEN
    CREATE TRIGGER trg_update_reservations_for_quote
    AFTER INSERT OR UPDATE OF statut, lignes
    ON public.devis
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_reservations_for_quote_fn();
  END IF;
END $$;
