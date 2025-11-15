-- Supprimer l'ancienne contrainte et en créer une nouvelle avec les statuts corrects
ALTER TABLE agenda_events DROP CONSTRAINT IF EXISTS agenda_events_status_check;

ALTER TABLE agenda_events ADD CONSTRAINT agenda_events_status_check 
CHECK (status IN ('à venir', 'terminé', 'reporté', 'annulé'));