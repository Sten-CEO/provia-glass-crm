-- Corriger la fonction pour gérer correctement les timezones et utiliser les bons champs de l'intervention

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
  v_job RECORD;
BEGIN
  -- Si le devis n'est pas accepté, annuler les réservations
  IF NEW.statut NOT IN ('Accepté', 'Validé', 'Terminé', 'Signé') THEN
    UPDATE material_reservations
    SET status = 'canceled'
    WHERE quote_id = NEW.id
      AND status IN ('planned', 'active');
    RETURN NEW;
  END IF;
  
  -- Trouver l'intervention liée
  SELECT * INTO v_job
  FROM jobs
  WHERE quote_id = NEW.id OR converted_from_quote_id = NEW.id
  LIMIT 1;
  
  IF v_job.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_job_id := v_job.id;
  
  -- Priorité 1: utiliser scheduled_start/scheduled_end de l'intervention si disponibles
  IF v_job.scheduled_start IS NOT NULL AND v_job.scheduled_end IS NOT NULL THEN
    v_scheduled_start := v_job.scheduled_start;
    v_scheduled_end := v_job.scheduled_end;
  -- Priorité 2: combiner date + heure_debut/heure_fin de l'intervention
  ELSIF v_job.date IS NOT NULL AND v_job.heure_debut IS NOT NULL AND v_job.heure_fin IS NOT NULL THEN
    -- Construire timestamp en combinant date et heure
    v_scheduled_start := (v_job.date || ' ' || v_job.heure_debut::TEXT)::TIMESTAMPTZ;
    v_scheduled_end := (v_job.date || ' ' || v_job.heure_fin::TEXT)::TIMESTAMPTZ;
  -- Priorité 3: utiliser les horaires du devis si l'intervention n'a pas d'horaires
  ELSIF NEW.planned_date IS NOT NULL AND NEW.planned_start_time IS NOT NULL AND NEW.planned_end_time IS NOT NULL THEN
    v_scheduled_start := (NEW.planned_date || ' ' || NEW.planned_start_time::TEXT)::TIMESTAMPTZ;
    v_scheduled_end := (NEW.planned_date || ' ' || NEW.planned_end_time::TEXT)::TIMESTAMPTZ;
  ELSE
    -- Pas d'horaires disponibles, ne pas créer de réservation
    RETURN NEW;
  END IF;
  
  -- Annuler les anciennes réservations
  UPDATE material_reservations
  SET status = 'canceled'
  WHERE quote_id = NEW.id;
  
  -- Créer les nouvelles réservations avec les horaires corrects
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
      qty_reserved,
      scheduled_start,
      scheduled_end,
      job_id,
      quote_id,
      status
    ) VALUES (
      v_inventory_item_id,
      v_qty,
      v_scheduled_start,
      v_scheduled_end,
      v_job_id,
      NEW.id,
      'planned'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Mettre à jour aussi le trigger sur jobs pour synchroniser avec les bons champs
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
  -- Calculer les horaires à partir des champs disponibles
  IF NEW.scheduled_start IS NOT NULL AND NEW.scheduled_end IS NOT NULL THEN
    v_scheduled_start := NEW.scheduled_start;
    v_scheduled_end := NEW.scheduled_end;
  ELSIF NEW.date IS NOT NULL AND NEW.heure_debut IS NOT NULL AND NEW.heure_fin IS NOT NULL THEN
    v_scheduled_start := (NEW.date || ' ' || NEW.heure_debut::TEXT)::TIMESTAMPTZ;
    v_scheduled_end := (NEW.date || ' ' || NEW.heure_fin::TEXT)::TIMESTAMPTZ;
  ELSE
    -- Pas d'horaires, ne rien faire
    RETURN NEW;
  END IF;
  
  -- Mettre à jour les horaires des réservations existantes
  UPDATE material_reservations
  SET 
    scheduled_start = v_scheduled_start,
    scheduled_end = v_scheduled_end
  WHERE job_id = NEW.id
    AND status IN ('planned', 'active');
  
  -- Si l'intervention est annulée, annuler les réservations
  IF NEW.statut = 'ANNULÉE' THEN
    UPDATE material_reservations
    SET status = 'canceled'
    WHERE job_id = NEW.id
      AND status IN ('planned', 'active');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Mettre à jour le trigger sur jobs pour surveiller aussi les changements de date/heure
DROP TRIGGER IF EXISTS trigger_sync_material_reservations_job ON jobs;
CREATE TRIGGER trigger_sync_material_reservations_job
  AFTER UPDATE ON jobs
  FOR EACH ROW
  WHEN (
    OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start OR
    OLD.scheduled_end IS DISTINCT FROM NEW.scheduled_end OR
    OLD.date IS DISTINCT FROM NEW.date OR
    OLD.heure_debut IS DISTINCT FROM NEW.heure_debut OR
    OLD.heure_fin IS DISTINCT FROM NEW.heure_fin OR
    OLD.statut IS DISTINCT FROM NEW.statut
  )
  EXECUTE FUNCTION sync_material_reservations_from_job();