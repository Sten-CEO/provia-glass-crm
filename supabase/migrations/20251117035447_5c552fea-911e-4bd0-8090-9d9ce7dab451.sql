-- Create function: update reservations and qty_reserved from a quote
CREATE OR REPLACE FUNCTION public.update_reservations_for_quote(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statut text;
  v_lignes jsonb;
  v_item uuid;
  v_qty numeric;
  v_prev numeric;
  v_now timestamp with time zone := now();
BEGIN
  SELECT statut, lignes INTO v_statut, v_lignes FROM public.devis WHERE id = p_quote_id;
  IF NOT FOUND THEN RETURN; END IF;

  CREATE TEMP TABLE _desired(item_id uuid PRIMARY KEY, qty numeric) ON COMMIT DROP;

  IF v_lignes IS NOT NULL THEN
    FOR v_item, v_qty IN
      SELECT (elem->>'inventory_item_id')::uuid AS item_id,
             COALESCE((elem->>'qty')::numeric, (elem->>'quantite')::numeric, 0) AS qty
      FROM jsonb_array_elements(v_lignes) AS elem
    LOOP
      IF v_item IS NOT NULL AND v_qty > 0 THEN
        INSERT INTO _desired(item_id, qty) VALUES (v_item, v_qty)
        ON CONFLICT (item_id) DO UPDATE SET qty = _desired.qty + EXCLUDED.qty;
      END IF;
    END LOOP;
  END IF;

  FOR v_item, v_qty IN
    SELECT inventory_item_id, COALESCE(qty_reserved,0)
    FROM public.inventory_reservations
    WHERE quote_id = p_quote_id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _desired d WHERE d.item_id = v_item) THEN
      UPDATE public.inventory_items SET qty_reserved = GREATEST(0, qty_reserved - v_qty)
      WHERE id = v_item;
      DELETE FROM public.inventory_reservations WHERE quote_id = p_quote_id AND inventory_item_id = v_item;
    END IF;
  END LOOP;

  IF v_statut IN ('Accepté','Validé','Terminé','Signé') THEN
    FOR v_item, v_qty IN SELECT item_id, qty FROM _desired LOOP
      SELECT qty_reserved INTO v_prev
      FROM public.inventory_reservations
      WHERE quote_id = p_quote_id AND inventory_item_id = v_item;
      IF v_prev IS NULL THEN v_prev := 0; END IF;

      IF v_qty <> v_prev THEN
        UPDATE public.inventory_items
        SET qty_reserved = GREATEST(0, qty_reserved + (v_qty - v_prev))
        WHERE id = v_item;
      END IF;

      INSERT INTO public.inventory_reservations(quote_id, inventory_item_id, qty_reserved, status, reserved_at)
      VALUES (p_quote_id, v_item, v_qty, 'reserved', v_now)
      ON CONFLICT (quote_id, inventory_item_id)
      DO UPDATE SET qty_reserved = EXCLUDED.qty_reserved, status = 'reserved', reserved_at = v_now;
    END LOOP;
  ELSE
    FOR v_item, v_qty IN SELECT item_id, qty FROM _desired LOOP
      SELECT qty_reserved INTO v_prev
      FROM public.inventory_reservations
      WHERE quote_id = p_quote_id AND inventory_item_id = v_item;
      IF v_prev IS NULL THEN v_prev := 0; END IF;
      IF v_prev > 0 THEN
        UPDATE public.inventory_items SET qty_reserved = GREATEST(0, qty_reserved - v_prev)
        WHERE id = v_item;
      END IF;
      DELETE FROM public.inventory_reservations WHERE quote_id = p_quote_id AND inventory_item_id = v_item;
    END LOOP;
  END IF;
END;$$;

CREATE OR REPLACE FUNCTION public.trg_update_reservations_for_quote_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_reservations_for_quote(NEW.id);
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_update_reservations_for_quote ON public.devis;
CREATE TRIGGER trg_update_reservations_for_quote
AFTER INSERT OR UPDATE OF statut, lignes ON public.devis
FOR EACH ROW
EXECUTE FUNCTION public.trg_update_reservations_for_quote_fn();

DO $$
DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.devis WHERE statut IN ('Accepté','Validé','Terminé','Signé') LOOP
    PERFORM public.update_reservations_for_quote(r.id);
  END LOOP;
END$$;

UPDATE public.inventory_items
SET qty_reserved = 0
WHERE id = 'e2d9d6fd-72ef-4be4-9a09-6bb416f56989'
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_reservations
    WHERE inventory_item_id = 'e2d9d6fd-72ef-4be4-9a09-6bb416f56989'
      AND status = 'reserved'
  );