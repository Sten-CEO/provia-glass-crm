-- Créer la table de réservations par créneaux pour les matériels
CREATE TABLE IF NOT EXISTS material_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES devis(id) ON DELETE CASCADE,
  qty_reserved NUMERIC NOT NULL DEFAULT 0,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'released', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_timerange CHECK (scheduled_end > scheduled_start),
  CONSTRAINT has_source CHECK (job_id IS NOT NULL OR quote_id IS NOT NULL)
);

-- Index pour performance
CREATE INDEX idx_material_reservations_material ON material_reservations(material_id);
CREATE INDEX idx_material_reservations_job ON material_reservations(job_id);
CREATE INDEX idx_material_reservations_quote ON material_reservations(quote_id);
CREATE INDEX idx_material_reservations_timerange ON material_reservations(scheduled_start, scheduled_end);

-- Fonction pour calculer qty_reserved pour les matériels basé sur les réservations futures
CREATE OR REPLACE FUNCTION calculate_material_reserved(p_material_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserved NUMERIC;
BEGIN
  -- Somme des réservations actives/planifiées pour ce matériel
  SELECT COALESCE(SUM(qty_reserved), 0)
  INTO v_reserved
  FROM material_reservations
  WHERE material_id = p_material_id
    AND status IN ('planned', 'active')
    AND scheduled_end >= NOW(); -- Seulement les réservations futures
    
  RETURN v_reserved;
END;
$$;

-- Fonction pour détecter les conflits de disponibilité sur un créneau
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
AS $$
DECLARE
  v_qty_on_hand NUMERIC;
  v_qty_reserved_on_slot NUMERIC;
  v_qty_available NUMERIC;
BEGIN
  -- Obtenir le stock total
  SELECT ii.qty_on_hand
  INTO v_qty_on_hand
  FROM inventory_items ii
  WHERE ii.id = p_material_id;
  
  -- Calculer la quantité déjà réservée sur ce créneau (chevauchement)
  SELECT COALESCE(SUM(mr.qty_reserved), 0)
  INTO v_qty_reserved_on_slot
  FROM material_reservations mr
  WHERE mr.material_id = p_material_id
    AND mr.status IN ('planned', 'active')
    AND mr.id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      -- Chevauchement de créneaux
      (mr.scheduled_start < p_end AND mr.scheduled_end > p_start)
    );
  
  v_qty_available := v_qty_on_hand - v_qty_reserved_on_slot;
  
  RETURN QUERY SELECT 
    v_qty_available >= p_qty_needed,
    v_qty_on_hand,
    v_qty_reserved_on_slot,
    v_qty_available;
END;
$$;

-- Trigger pour mettre à jour qty_reserved des matériels automatiquement
CREATE OR REPLACE FUNCTION update_material_qty_reserved()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_material_id UUID;
BEGIN
  -- Détecter quel matériel est affecté
  IF TG_OP = 'DELETE' THEN
    v_material_id := OLD.material_id;
  ELSE
    v_material_id := NEW.material_id;
  END IF;
  
  -- Recalculer et mettre à jour qty_reserved pour ce matériel
  UPDATE inventory_items
  SET qty_reserved = calculate_material_reserved(v_material_id)
  WHERE id = v_material_id
    AND type = 'materiel';
    
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_material_reserved
AFTER INSERT OR UPDATE OR DELETE ON material_reservations
FOR EACH ROW
EXECUTE FUNCTION update_material_qty_reserved();

-- Fonction pour créer/mettre à jour les réservations de matériels depuis un devis accepté
CREATE OR REPLACE FUNCTION sync_material_reservations_from_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
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
  -- Vérifier si le devis est dans un état "accepté"
  IF NEW.statut NOT IN ('Accepté', 'Validé', 'Terminé', 'Signé') THEN
    -- Annuler toutes les réservations de matériels pour ce devis
    UPDATE material_reservations
    SET status = 'canceled'
    WHERE quote_id = NEW.id
      AND status IN ('planned', 'active');
    RETURN NEW;
  END IF;
  
  -- Vérifier qu'il y a une intervention liée avec dates planifiées
  SELECT id INTO v_job_id
  FROM jobs
  WHERE quote_id = NEW.id OR converted_from_quote_id = NEW.id
  LIMIT 1;
  
  IF v_job_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Construire les timestamps de début et fin
  IF NEW.planned_date IS NOT NULL AND NEW.planned_start_time IS NOT NULL AND NEW.planned_end_time IS NOT NULL THEN
    v_scheduled_start := (NEW.planned_date || ' ' || NEW.planned_start_time)::TIMESTAMPTZ;
    v_scheduled_end := (NEW.planned_date || ' ' || NEW.planned_end_time)::TIMESTAMPTZ;
  ELSE
    -- Pas de créneau défini, ne rien faire
    RETURN NEW;
  END IF;
  
  -- Annuler les anciennes réservations
  UPDATE material_reservations
  SET status = 'canceled'
  WHERE quote_id = NEW.id;
  
  -- Créer les nouvelles réservations pour chaque ligne matériel
  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.lignes, '[]'::JSONB))
  LOOP
    -- Extraire inventory_item_id
    v_inventory_item_id := (v_line->>'inventory_item_id')::UUID;
    
    IF v_inventory_item_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Vérifier que c'est un matériel
    SELECT type INTO v_item_type
    FROM inventory_items
    WHERE id = v_inventory_item_id;
    
    IF v_item_type != 'materiel' THEN
      CONTINUE;
    END IF;
    
    -- Extraire la quantité
    v_qty := COALESCE((v_line->>'qty')::NUMERIC, (v_line->>'quantity')::NUMERIC, 0);
    
    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Créer la réservation
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

CREATE TRIGGER trigger_sync_material_reservations_quote
AFTER INSERT OR UPDATE OF statut, lignes, planned_date, planned_start_time, planned_end_time ON devis
FOR EACH ROW
EXECUTE FUNCTION sync_material_reservations_from_quote();

-- Fonction pour libérer les réservations quand intervention terminée
CREATE OR REPLACE FUNCTION release_material_reservations_on_job_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si l'intervention passe à Terminée, libérer les matériels
  IF NEW.statut = 'Terminée' AND (OLD.statut IS NULL OR OLD.statut != 'Terminée') THEN
    UPDATE material_reservations
    SET status = 'released'
    WHERE job_id = NEW.id
      AND status IN ('planned', 'active');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_release_materials_on_complete
AFTER UPDATE OF statut ON jobs
FOR EACH ROW
EXECUTE FUNCTION release_material_reservations_on_job_complete();

-- RLS policies
ALTER TABLE material_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access on material_reservations"
ON material_reservations
FOR ALL
USING (true)
WITH CHECK (true);

-- Recalculer qty_reserved pour tous les matériels existants
UPDATE inventory_items
SET qty_reserved = 0
WHERE type = 'materiel';