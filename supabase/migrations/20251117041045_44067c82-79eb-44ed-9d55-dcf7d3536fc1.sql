-- Corriger la logique de consommation pour distinguer CONSOMMABLES et MATERIELS
CREATE OR REPLACE FUNCTION public.consume_intervention_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Vérifier si le statut passe à 'Terminée'
  IF NEW.statut = 'Terminée' AND (OLD.statut IS NULL OR OLD.statut != 'Terminée') THEN
    
    -- Consommer les réservations d'inventaire liées à cette intervention
    UPDATE inventory_reservations
    SET 
      status = 'consumed',
      consumed_at = NOW(),
      qty_consumed = qty_reserved
    WHERE job_id = NEW.id 
      AND status = 'reserved';
    
    -- CONSOMMABLES: Déduire stock ET réservation
    UPDATE inventory_items
    SET 
      qty_on_hand = qty_on_hand - consumed.total_qty,
      qty_reserved = qty_reserved - consumed.total_qty
    FROM (
      SELECT 
        ic.inventory_item_id,
        SUM(ic.quantity) as total_qty
      FROM intervention_consumables ic
      INNER JOIN inventory_items ii ON ic.inventory_item_id = ii.id
      WHERE ic.intervention_id = NEW.id
        AND ic.inventory_item_id IS NOT NULL
        AND ii.type = 'consommable'
      GROUP BY ic.inventory_item_id
    ) consumed
    WHERE inventory_items.id = consumed.inventory_item_id;
    
    -- MATERIELS: Libérer SEULEMENT la réservation (stock inchangé)
    UPDATE inventory_items
    SET 
      qty_reserved = qty_reserved - materials.total_qty
    FROM (
      SELECT 
        ic.inventory_item_id,
        SUM(ic.quantity) as total_qty
      FROM intervention_consumables ic
      INNER JOIN inventory_items ii ON ic.inventory_item_id = ii.id
      WHERE ic.intervention_id = NEW.id
        AND ic.inventory_item_id IS NOT NULL
        AND ii.type = 'materiel'
      GROUP BY ic.inventory_item_id
    ) materials
    WHERE inventory_items.id = materials.inventory_item_id;
    
    -- Créer les mouvements d'inventaire pour CONSOMMABLES (consommation réelle)
    INSERT INTO inventory_movements (
      item_id,
      type,
      source,
      qty,
      ref_id,
      ref_number,
      note,
      status,
      effective_at,
      created_by
    )
    SELECT 
      ic.inventory_item_id,
      'out',
      'intervention',
      -ic.quantity,
      NEW.id::text,
      NEW.intervention_number,
      'Consommation automatique - Intervention terminée',
      'done',
      NOW(),
      NEW.employe_id
    FROM intervention_consumables ic
    INNER JOIN inventory_items ii ON ic.inventory_item_id = ii.id
    WHERE ic.intervention_id = NEW.id
      AND ic.inventory_item_id IS NOT NULL
      AND ii.type = 'consommable';
    
    -- Créer les mouvements d'inventaire pour MATERIELS (libération/restitution)
    INSERT INTO inventory_movements (
      item_id,
      type,
      source,
      qty,
      ref_id,
      ref_number,
      note,
      status,
      effective_at,
      created_by
    )
    SELECT 
      ic.inventory_item_id,
      'reserve',
      'intervention',
      -ic.quantity,
      NEW.id::text,
      NEW.intervention_number,
      'Libération matériel - Intervention terminée',
      'done',
      NOW(),
      NEW.employe_id
    FROM intervention_consumables ic
    INNER JOIN inventory_items ii ON ic.inventory_item_id = ii.id
    WHERE ic.intervention_id = NEW.id
      AND ic.inventory_item_id IS NOT NULL
      AND ii.type = 'materiel';
    
  END IF;
  
  RETURN NEW;
END;
$function$;