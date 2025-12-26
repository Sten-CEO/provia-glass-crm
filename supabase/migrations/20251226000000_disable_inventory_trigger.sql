-- Désactiver le trigger qui cause une double déduction de stock
-- Le frontend gère maintenant la consommation d'inventaire avec des checks d'idempotence
-- Ce trigger crée une double déduction car il se déclenche EN PLUS du code frontend

DROP TRIGGER IF EXISTS consume_inventory_on_job_complete ON jobs;

-- Optionnel: garder la fonction mais ne plus l'utiliser comme trigger
-- COMMENT ON FUNCTION consume_intervention_inventory() IS
--   'Fonction désactivée - la consommation est maintenant gérée par le frontend (consumeReservedInventory)';
