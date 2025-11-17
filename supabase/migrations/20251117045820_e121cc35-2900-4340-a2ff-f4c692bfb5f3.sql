-- Corriger le trigger pour utiliser les horaires réels de l'intervention

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
  
  -- Utiliser les horaires RÉELS de l'intervention (scheduled_start, scheduled_end)
  -- et non pas les horaires du devis
  IF v_job.scheduled_start IS NOT NULL AND v_job.scheduled_end IS NOT NULL THEN
    v_scheduled_start := v_job.scheduled_start;
    v_scheduled_end := v_job.scheduled_end;
  ELSE
    -- Si l'intervention n'a pas d'horaires, ne pas créer de réservation
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
    
    v_qty := COALESCE((v_line->>'quantity')::NUMERIC, 0);
    
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

-- Créer aussi un trigger sur la table jobs pour mettre à jour les réservations
-- quand les horaires de l'intervention changent
CREATE OR REPLACE FUNCTION sync_material_reservations_from_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Mettre à jour les horaires des réservations existantes si l'intervention change
  IF NEW.scheduled_start IS NOT NULL AND NEW.scheduled_end IS NOT NULL THEN
    UPDATE material_reservations
    SET 
      scheduled_start = NEW.scheduled_start,
      scheduled_end = NEW.scheduled_end
    WHERE job_id = NEW.id
      AND status IN ('planned', 'active');
  END IF;
  
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

-- Créer le trigger sur jobs
DROP TRIGGER IF EXISTS trigger_sync_material_reservations_job ON jobs;
CREATE TRIGGER trigger_sync_material_reservations_job
  AFTER UPDATE ON jobs
  FOR EACH ROW
  WHEN (
    OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start OR
    OLD.scheduled_end IS DISTINCT FROM NEW.scheduled_end OR
    OLD.statut IS DISTINCT FROM NEW.statut
  )
  EXECUTE FUNCTION sync_material_reservations_from_job();

-- Créer une fonction pour créer des notifications lors de réservations matériels
CREATE OR REPLACE FUNCTION notify_material_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_material_name TEXT;
  v_job_title TEXT;
  v_start_formatted TEXT;
  v_end_formatted TEXT;
BEGIN
  -- Ne notifier que pour les nouvelles réservations
  IF TG_OP = 'INSERT' AND NEW.status = 'planned' THEN
    -- Récupérer le nom du matériel
    SELECT name INTO v_material_name
    FROM inventory_items
    WHERE id = NEW.material_id;
    
    -- Récupérer le titre de l'intervention
    SELECT titre INTO v_job_title
    FROM jobs
    WHERE id = NEW.job_id;
    
    -- Formater les dates
    v_start_formatted := TO_CHAR(NEW.scheduled_start, 'DD/MM/YYYY à HH24:MI');
    v_end_formatted := TO_CHAR(NEW.scheduled_end, 'HH24:MI');
    
    -- Créer la notification
    INSERT INTO notifications (
      title,
      message,
      kind,
      level,
      link,
      entity_type,
      entity_id
    ) VALUES (
      'Matériel réservé',
      NEW.qty_reserved || 'x ' || v_material_name || ' pour l''intervention "' || v_job_title || '" le ' || v_start_formatted || ' – ' || v_end_formatted,
      'material_reserved',
      'info',
      '/interventions/' || NEW.job_id || '/report',
      'material_reservation',
      NEW.id
    );
  END IF;
  
  -- Notifier si le créneau est modifié
  IF TG_OP = 'UPDATE' AND (
    OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start OR
    OLD.scheduled_end IS DISTINCT FROM NEW.scheduled_end
  ) THEN
    SELECT name INTO v_material_name
    FROM inventory_items
    WHERE id = NEW.material_id;
    
    SELECT titre INTO v_job_title
    FROM jobs
    WHERE id = NEW.job_id;
    
    v_start_formatted := TO_CHAR(NEW.scheduled_start, 'DD/MM/YYYY à HH24:MI');
    v_end_formatted := TO_CHAR(NEW.scheduled_end, 'HH24:MI');
    
    INSERT INTO notifications (
      title,
      message,
      kind,
      level,
      link,
      entity_type,
      entity_id
    ) VALUES (
      'Réservation matériel modifiée',
      NEW.qty_reserved || 'x ' || v_material_name || ' pour l''intervention "' || v_job_title || '" - Nouveau créneau: ' || v_start_formatted || ' – ' || v_end_formatted,
      'material_reserved',
      'warning',
      '/interventions/' || NEW.job_id || '/report',
      'material_reservation',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les notifications
DROP TRIGGER IF EXISTS trigger_notify_material_reservation ON material_reservations;
CREATE TRIGGER trigger_notify_material_reservation
  AFTER INSERT OR UPDATE ON material_reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_material_reservation();