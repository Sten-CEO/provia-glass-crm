-- Update clients statut field to use new lowercase values
-- Update existing values to lowercase versions
UPDATE clients SET statut = 'nouveau' WHERE statut = 'Nouveau' OR statut = 'Actif' OR statut IS NULL;
UPDATE clients SET statut = 'en_cours' WHERE statut = 'En cours';
UPDATE clients SET statut = 'attente' WHERE statut = 'Attente de réponses' OR statut = 'Attente';
UPDATE clients SET statut = 'resolues' WHERE statut = 'Résolues';
UPDATE clients SET statut = 'ferme' WHERE statut = 'Fermé' OR statut = 'Inactif';
UPDATE clients SET statut = 'rejete' WHERE statut = 'Rejeté';

-- Set default value for new records
ALTER TABLE clients ALTER COLUMN statut SET DEFAULT 'nouveau';

-- Add a check constraint to ensure only valid status values
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_statut_check;
ALTER TABLE clients 
ADD CONSTRAINT clients_statut_check 
CHECK (statut IN ('nouveau', 'en_cours', 'attente', 'resolues', 'ferme', 'rejete'));