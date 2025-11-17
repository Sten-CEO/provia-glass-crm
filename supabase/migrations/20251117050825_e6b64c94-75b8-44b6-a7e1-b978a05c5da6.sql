-- Ajuster la conversion des heures locales (Europe/Paris) -> UTC lors de la création/sync des réservations

CREATE OR REPLACE FUNCTION sync_material_reservations_from_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_line JSONB;
  v_inventory_item_id UUID;
  v_item_type TEXT;
  v_qty NUMERIC;
  v_scheduled_start TIMESTAMPTZ;
  v_scheduled_end TIMESTAMPTZ;
  v_job RECORD;
BEGIN
  IF NEW.statut NOT IN ('Accepté', 'Validé', 'Terminé', 'Signé') THEN
    UPDATE material_reservations
    SET status = 'canceled'
    WHERE quote_id = NEW.id
      AND status IN ('planned', 'active');
    RETURN NEW;
  END IF;

  SELECT * INTO v_job
  FROM jobs
  WHERE quote_id = NEW.id OR converted_from_quote_id = NEW.id
  LIMIT 1;
  IF v_job.id IS NULL THEN RETURN NEW; END IF;

  -- 1) Utiliser scheduled_* si présents (déjà en timestamptz, donc OK)
  IF v_job.scheduled_start IS NOT NULL AND v_job.scheduled_end IS NOT NULL THEN
    v_scheduled_start := v_job.scheduled_start;
    v_scheduled_end := v_job.scheduled_end;
  -- 2) Sinon combiner date + heure_* en les interprétant comme heures locales Europe/Paris
  ELSIF v_job.date IS NOT NULL AND v_job.heure_debut IS NOT NULL AND v_job.heure_fin IS NOT NULL THEN
    v_scheduled_start := ((v_job.date || ' ' || v_job.heure_debut::TEXT)::timestamp AT TIME ZONE 'Europe/Paris');
    v_scheduled_end   := ((v_job.date || ' ' || v_job.heure_fin::TEXT)::timestamp   AT TIME ZONE 'Europe/Paris');
  -- 3) Fallback: champs du devis (planned_*) interprétés en Europe/Paris
  ELSIF NEW.planned_date IS NOT NULL AND NEW.planned_start_time IS NOT NULL AND NEW.planned_end_time IS NOT NULL THEN
    v_scheduled_start := ((NEW.planned_date || ' ' || NEW.planned_start_time::TEXT)::timestamp AT TIME ZONE 'Europe/Paris');
    v_scheduled_end   := ((NEW.planned_date || ' ' || NEW.planned_end_time::TEXT)::timestamp   AT TIME ZONE 'Europe/Paris');
  ELSE
    RETURN NEW;
  END IF;

  UPDATE material_reservations SET status = 'canceled' WHERE quote_id = NEW.id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.lignes, '[]'::JSONB)) LOOP
    v_inventory_item_id := (v_line->>'inventory_item_id')::UUID;
    IF v_inventory_item_id IS NULL THEN CONTINUE; END IF;

    SELECT type INTO v_item_type FROM inventory_items WHERE id = v_inventory_item_id;
    IF v_item_type != 'materiel' THEN CONTINUE; END IF;

    v_qty := COALESCE((v_line->>'qty')::NUMERIC, (v_line->>'quantity')::NUMERIC, 0);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    INSERT INTO material_reservations (
      material_id, qty_reserved, scheduled_start, scheduled_end, job_id, quote_id, status
    ) VALUES (
      v_inventory_item_id, v_qty, v_scheduled_start, v_scheduled_end, v_job.id, NEW.id, 'planned'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_material_reservations_from_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_scheduled_start TIMESTAMPTZ;
  v_scheduled_end TIMESTAMPTZ;
BEGIN
  IF NEW.scheduled_start IS NOT NULL AND NEW.scheduled_end IS NOT NULL THEN
    v_scheduled_start := NEW.scheduled_start;
    v_scheduled_end := NEW.scheduled_end;
  ELSIF NEW.date IS NOT NULL AND NEW.heure_debut IS NOT NULL AND NEW.heure_fin IS NOT NULL THEN
    v_scheduled_start := ((NEW.date || ' ' || NEW.heure_debut::TEXT)::timestamp AT TIME ZONE 'Europe/Paris');
    v_scheduled_end   := ((NEW.date || ' ' || NEW.heure_fin::TEXT)::timestamp   AT TIME ZONE 'Europe/Paris');
  ELSE
    RETURN NEW;
  END IF;

  UPDATE material_reservations
  SET scheduled_start = v_scheduled_start,
      scheduled_end   = v_scheduled_end
  WHERE job_id = NEW.id
    AND status IN ('planned', 'active');

  IF NEW.statut = 'ANNULÉE' THEN
    UPDATE material_reservations SET status = 'canceled' WHERE job_id = NEW.id AND status IN ('planned', 'active');
  END IF;

  RETURN NEW;
END;
$$;

-- Le trigger existant sur jobs reste inchangé (déjà recréé précédemment)
