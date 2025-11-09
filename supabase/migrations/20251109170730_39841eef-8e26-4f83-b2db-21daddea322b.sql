-- Créer l'enum pour le statut des timesheets si non existant
DO $$ BEGIN
  CREATE TYPE public.timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ajouter colonnes manquantes sur timesheets_entries
ALTER TABLE public.timesheets_entries 
  ADD COLUMN IF NOT EXISTS overtime_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.equipe(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.equipe(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Ajouter colonne manager sur table equipe si non existante
ALTER TABLE public.equipe 
  ADD COLUMN IF NOT EXISTS is_manager boolean DEFAULT false;

-- Fonction pour calculer automatiquement les heures et coûts
CREATE OR REPLACE FUNCTION public.calculate_timesheet_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_rate numeric;
  total_minutes numeric;
  regular_hours numeric;
  overtime numeric;
BEGIN
  -- Récupérer le taux horaire de l'employé
  SELECT hourly_rate INTO employee_rate
  FROM equipe
  WHERE id = NEW.employee_id;
  
  -- Si un taux n'est pas défini sur l'entrée, utiliser celui de l'employé
  IF NEW.hourly_rate IS NULL OR NEW.hourly_rate = 0 THEN
    NEW.hourly_rate := COALESCE(employee_rate, 0);
  END IF;
  
  -- Calculer les heures si start_at et end_at sont renseignés
  IF NEW.start_at IS NOT NULL AND NEW.end_at IS NOT NULL THEN
    -- Calculer la différence en minutes
    total_minutes := EXTRACT(EPOCH FROM (NEW.end_at - NEW.start_at)) / 60;
    
    -- Soustraire la pause
    total_minutes := total_minutes - COALESCE(NEW.break_min, 0);
    
    -- Convertir en heures décimales
    NEW.hours := total_minutes / 60.0;
    
    -- Calculer heures supplémentaires (> 8h par jour)
    IF NEW.hours > 8 THEN
      NEW.overtime_hours := NEW.hours - 8;
      regular_hours := 8;
    ELSE
      NEW.overtime_hours := 0;
      regular_hours := NEW.hours;
    END IF;
  ELSE
    regular_hours := NEW.hours;
  END IF;
  
  -- Calculer le coût total (heures normales + heures sup x 1.5)
  NEW.cost := (regular_hours * NEW.hourly_rate) + 
              (COALESCE(NEW.overtime_hours, 0) * NEW.hourly_rate * 1.5);
  
  RETURN NEW;
END;
$$;

-- Trigger pour calcul automatique
DROP TRIGGER IF EXISTS calculate_timesheet_entry_trigger ON public.timesheets_entries;
CREATE TRIGGER calculate_timesheet_entry_trigger
  BEFORE INSERT OR UPDATE ON public.timesheets_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_timesheet_entry();

-- Fonction pour vérifier si un utilisateur est manager
CREATE OR REPLACE FUNCTION public.is_manager(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_manager, false)
  FROM equipe
  WHERE id = user_id;
$$;

-- Fonction pour approuver des entrées en masse
CREATE OR REPLACE FUNCTION public.bulk_approve_timesheets(
  entry_ids uuid[],
  manager_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est manager
  IF NOT is_manager(manager_id) THEN
    RAISE EXCEPTION 'User is not authorized to approve timesheets';
  END IF;
  
  -- Approuver les entrées
  UPDATE timesheets_entries
  SET 
    status = 'approved',
    approved_at = now(),
    approved_by = manager_id
  WHERE id = ANY(entry_ids)
    AND status IN ('draft', 'submitted');
END;
$$;

-- Fonction pour rejeter des entrées en masse
CREATE OR REPLACE FUNCTION public.bulk_reject_timesheets(
  entry_ids uuid[],
  manager_id uuid,
  reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est manager
  IF NOT is_manager(manager_id) THEN
    RAISE EXCEPTION 'User is not authorized to reject timesheets';
  END IF;
  
  -- Rejeter les entrées
  UPDATE timesheets_entries
  SET 
    status = 'rejected',
    rejected_at = now(),
    rejected_by = manager_id,
    rejection_reason = reason
  WHERE id = ANY(entry_ids)
    AND status IN ('draft', 'submitted');
END;
$$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timesheets_entries_date ON timesheets_entries(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_entries_employee ON timesheets_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_entries_status ON timesheets_entries(status);