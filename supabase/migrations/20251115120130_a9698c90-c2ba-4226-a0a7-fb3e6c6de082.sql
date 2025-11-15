-- Corriger la fonction pour ajouter le search_path
CREATE OR REPLACE FUNCTION consume_intervention_inventory()
RETURNS TRIGGER AS $$
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
    
    -- Déduire les quantités de l'inventaire pour chaque consommable
    UPDATE inventory_items
    SET 
      qty_on_hand = qty_on_hand - consumed.total_qty,
      qty_reserved = qty_reserved - consumed.total_qty
    FROM (
      SELECT 
        ic.inventory_item_id,
        SUM(ic.quantity) as total_qty
      FROM intervention_consumables ic
      WHERE ic.intervention_id = NEW.id
        AND ic.inventory_item_id IS NOT NULL
      GROUP BY ic.inventory_item_id
    ) consumed
    WHERE inventory_items.id = consumed.inventory_item_id;
    
    -- Créer les mouvements d'inventaire pour traçabilité
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
    WHERE ic.intervention_id = NEW.id
      AND ic.inventory_item_id IS NOT NULL;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;