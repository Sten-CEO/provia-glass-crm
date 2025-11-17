-- Corriger les fonctions avec search_path pour sécurité

CREATE OR REPLACE FUNCTION calculate_material_reserved(p_material_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_reserved NUMERIC;
BEGIN
  SELECT COALESCE(SUM(qty_reserved), 0)
  INTO v_reserved
  FROM material_reservations
  WHERE material_id = p_material_id
    AND status IN ('planned', 'active')
    AND scheduled_end >= NOW();
    
  RETURN v_reserved;
END;
$$;

CREATE OR REPLACE FUNCTION check_material_availability(
  p_material_id UUID,
  p_qty_needed NUMERIC,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_available BOOLEAN,
  qty_on_hand NUMERIC,
  qty_already_reserved NUMERIC,
  qty_available NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_qty_on_hand NUMERIC;
  v_qty_reserved_on_slot NUMERIC;
  v_qty_available NUMERIC;
BEGIN
  SELECT ii.qty_on_hand
  INTO v_qty_on_hand
  FROM inventory_items ii
  WHERE ii.id = p_material_id;
  
  SELECT COALESCE(SUM(mr.qty_reserved), 0)
  INTO v_qty_reserved_on_slot
  FROM material_reservations mr
  WHERE mr.material_id = p_material_id
    AND mr.status IN ('planned', 'active')
    AND mr.id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (mr.scheduled_start < p_end AND mr.scheduled_end > p_start);
  
  v_qty_available := v_qty_on_hand - v_qty_reserved_on_slot;
  
  RETURN QUERY SELECT 
    v_qty_available >= p_qty_needed,
    v_qty_on_hand,
    v_qty_reserved_on_slot,
    v_qty_available;
END;
$$;

CREATE OR REPLACE FUNCTION update_material_qty_reserved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_material_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_material_id := OLD.material_id;
  ELSE
    v_material_id := NEW.material_id;
  END IF;
  
  UPDATE inventory_items
  SET qty_reserved = calculate_material_reserved(v_material_id)
  WHERE id = v_material_id
    AND type = 'materiel';
    
  RETURN COALESCE(NEW, OLD);
END;
$$;

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
  v_job_id UUID;
BEGIN
  IF NEW.statut NOT IN ('Accepté', 'Validé', 'Terminé', 'Signé') THEN
    UPDATE material_reservations
    SET status = 'canceled'
    WHERE quote_id = NEW.id
      AND status IN ('planned', 'active');
    RETURN NEW;
  END IF;
  
  SELECT id INTO v_job_id
  FROM jobs
  WHERE quote_id = NEW.id OR converted_from_quote_id = NEW.id
  LIMIT 1;
  
  IF v_job_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.planned_date IS NOT NULL AND NEW.planned_start_time IS NOT NULL AND NEW.planned_end_time IS NOT NULL THEN
    v_scheduled_start := (NEW.planned_date || ' ' || NEW.planned_start_time)::TIMESTAMPTZ;
    v_scheduled_end := (NEW.planned_date || ' ' || NEW.planned_end_time)::TIMESTAMPTZ;
  ELSE
    RETURN NEW;
  END IF;
  
  UPDATE material_reservations
  SET status = 'canceled'
  WHERE quote_id = NEW.id;
  
  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.lignes, '[]'::JSONB))
  LOOP
    v_inventory_item_id := (v_line->>'inventory_item_id')::UUID;
    
    IF v_inventory_item_id IS NULL THEN
      CONTINUE;
    END IF;
    
    SELECT type INTO v_item_type
    FROM inventory_items
    WHERE id = v_inventory_item_id;
    
    IF v_item_type != 'materiel' THEN
      CONTINUE;
    END IF;
    
    v_qty := COALESCE((v_line->>'qty')::NUMERIC, (v_line->>'quantity')::NUMERIC, 0);
    
    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;
    
    INSERT INTO material_reservations (
      material_id,
      quote_id,
      job_id,
      qty_reserved,
      scheduled_start,
      scheduled_end,
      status
    ) VALUES (
      v_inventory_item_id,
      NEW.id,
      v_job_id,
      v_qty,
      v_scheduled_start,
      v_scheduled_end,
      'planned'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION release_material_reservations_on_job_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.statut = 'Terminée' AND (OLD.statut IS NULL OR OLD.statut != 'Terminée') THEN
    UPDATE material_reservations
    SET status = 'released'
    WHERE job_id = NEW.id
      AND status IN ('planned', 'active');
  END IF;
  
  RETURN NEW;
END;
$$;