CREATE OR REPLACE FUNCTION public.sync_quote_reservations_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item uuid;
  v_qty numeric;
  v_prev numeric;
BEGIN
  CREATE TEMP TABLE _desired(item_id uuid PRIMARY KEY, qty numeric) ON COMMIT DROP;

  IF NEW.lignes IS NOT NULL THEN
    INSERT INTO _desired(item_id, qty)
    SELECT 
      (elem->>'inventory_item_id')::uuid AS item_id,
      COALESCE((elem->>'qty')::numeric, (elem->>'quantite')::numeric, 0) AS qty
    FROM jsonb_array_elements(NEW.lignes) AS elem
    WHERE (elem->>'inventory_item_id') IS NOT NULL 
      AND COALESCE((elem->>'qty')::numeric, (elem->>'quantite')::numeric, 0) > 0
    ON CONFLICT (item_id) DO UPDATE SET qty = _desired.qty + EXCLUDED.qty;
  END IF;

  FOR v_item, v_qty IN
    SELECT inventory_item_id, COALESCE(qty_reserved,0)
    FROM inventory_reservations
    WHERE quote_id = NEW.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _desired d WHERE d.item_id = v_item) THEN
      UPDATE inventory_items SET qty_reserved = GREATEST(0, qty_reserved - v_qty)
      WHERE id = v_item;
      DELETE FROM inventory_reservations WHERE quote_id = NEW.id AND inventory_item_id = v_item;
    END IF;
  END LOOP;

  IF NEW.statut IN ('Accepté','Validé','Terminé','Signé') THEN
    FOR v_item, v_qty IN SELECT item_id, qty FROM _desired LOOP
      SELECT COALESCE(qty_reserved, 0) INTO v_prev
      FROM inventory_reservations
      WHERE quote_id = NEW.id AND inventory_item_id = v_item;

      IF v_qty <> v_prev THEN
        UPDATE inventory_items
        SET qty_reserved = GREATEST(0, qty_reserved + (v_qty - v_prev))
        WHERE id = v_item;
      END IF;

      INSERT INTO inventory_reservations(quote_id, inventory_item_id, qty_reserved, status, reserved_at)
      VALUES (NEW.id, v_item, v_qty, 'reserved', now())
      ON CONFLICT (quote_id, inventory_item_id)
      DO UPDATE SET qty_reserved = EXCLUDED.qty_reserved, status = 'reserved', reserved_at = now();
    END LOOP;
  ELSE
    FOR v_item IN SELECT item_id FROM _desired LOOP
      SELECT COALESCE(qty_reserved, 0) INTO v_prev
      FROM inventory_reservations
      WHERE quote_id = NEW.id AND inventory_item_id = v_item;
      IF v_prev > 0 THEN
        UPDATE inventory_items SET qty_reserved = GREATEST(0, qty_reserved - v_prev)
        WHERE id = v_item;
      END IF;
      DELETE FROM inventory_reservations WHERE quote_id = NEW.id AND inventory_item_id = v_item;
    END LOOP;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_sync_quote_reservations ON devis;
CREATE TRIGGER trg_sync_quote_reservations
AFTER INSERT OR UPDATE OF statut, lignes ON devis
FOR EACH ROW
EXECUTE FUNCTION sync_quote_reservations_trigger();