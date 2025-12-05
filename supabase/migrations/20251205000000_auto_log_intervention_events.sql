-- Migration pour automatiser l'enregistrement des événements dans l'historique des interventions

-- Fonction pour logger les événements de pointage dans intervention_logs
CREATE OR REPLACE FUNCTION log_timesheet_event()
RETURNS TRIGGER AS $$
DECLARE
  emp_name TEXT;
  action_text TEXT;
  details_text TEXT;
  duration_text TEXT;
BEGIN
  -- Récupérer le nom de l'employé
  SELECT nom INTO emp_name FROM equipe WHERE id = NEW.employee_id;

  -- Construire le texte d'action et les détails selon le type d'événement
  CASE NEW.type
    WHEN 'start_day' THEN
      action_text := 'Pointage - Début';
      details_text := format('Début de journée par %s à %s',
        COALESCE(emp_name, 'Employé'),
        to_char(NEW.at, 'HH24:MI'));
    WHEN 'pause_start' THEN
      action_text := 'Pointage - Début pause';
      details_text := format('Début de pause par %s à %s',
        COALESCE(emp_name, 'Employé'),
        to_char(NEW.at, 'HH24:MI'));
    WHEN 'pause_end' THEN
      action_text := 'Pointage - Fin pause';
      IF NEW.duration_minutes IS NOT NULL THEN
        duration_text := format(' (durée: %s min)', NEW.duration_minutes);
      ELSE
        duration_text := '';
      END IF;
      details_text := format('Fin de pause par %s à %s%s',
        COALESCE(emp_name, 'Employé'),
        to_char(NEW.at, 'HH24:MI'),
        duration_text);
    WHEN 'stop_day' THEN
      action_text := 'Pointage - Fin';
      IF NEW.duration_minutes IS NOT NULL THEN
        duration_text := format(' (durée totale: %s min)', NEW.duration_minutes);
      ELSE
        duration_text := '';
      END IF;
      details_text := format('Fin de journée par %s à %s%s',
        COALESCE(emp_name, 'Employé'),
        to_char(NEW.at, 'HH24:MI'),
        duration_text);
    WHEN 'manual' THEN
      action_text := 'Pointage - Manuel';
      details_text := format('Pointage manuel par %s', COALESCE(emp_name, 'Employé'));
    ELSE
      action_text := 'Pointage';
      details_text := format('Événement de pointage par %s', COALESCE(emp_name, 'Employé'));
  END CASE;

  -- Insérer le log seulement si l'événement est lié à une intervention
  IF NEW.job_id IS NOT NULL THEN
    INSERT INTO intervention_logs (
      intervention_id,
      action,
      details,
      user_name
    ) VALUES (
      NEW.job_id,
      action_text,
      details_text,
      emp_name
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur timesheets_events
DROP TRIGGER IF EXISTS trigger_log_timesheet_event ON timesheets_events;
CREATE TRIGGER trigger_log_timesheet_event
  AFTER INSERT ON timesheets_events
  FOR EACH ROW
  EXECUTE FUNCTION log_timesheet_event();

-- Fonction pour logger les changements de statut des interventions
CREATE OR REPLACE FUNCTION log_job_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_name_val TEXT;
BEGIN
  -- Vérifier si le statut a changé
  IF (TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut) THEN
    -- Tenter de récupérer le nom de l'utilisateur courant
    SELECT nom INTO user_name_val FROM equipe
    WHERE user_id = auth.uid() LIMIT 1;

    -- Insérer le log de changement de statut
    INSERT INTO intervention_logs (
      intervention_id,
      action,
      details,
      user_name
    ) VALUES (
      NEW.id,
      'Changement de statut',
      format('Statut modifié de "%s" à "%s"',
        COALESCE(OLD.statut, 'Non défini'),
        COALESCE(NEW.statut, 'Non défini')),
      user_name_val
    );
  END IF;

  -- Logger la création d'une intervention
  IF TG_OP = 'INSERT' THEN
    -- Tenter de récupérer le nom de l'utilisateur courant
    SELECT nom INTO user_name_val FROM equipe
    WHERE user_id = auth.uid() LIMIT 1;

    INSERT INTO intervention_logs (
      intervention_id,
      action,
      details,
      user_name
    ) VALUES (
      NEW.id,
      'Création',
      format('Intervention "%s" créée avec le statut "%s"',
        COALESCE(NEW.titre, 'Sans titre'),
        COALESCE(NEW.statut, 'Non défini')),
      user_name_val
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur jobs
DROP TRIGGER IF EXISTS trigger_log_job_status_change ON jobs;
CREATE TRIGGER trigger_log_job_status_change
  AFTER INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION log_job_status_change();

-- Fonction pour logger les modifications importantes (dates, assignation, etc.)
CREATE OR REPLACE FUNCTION log_job_important_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_name_val TEXT;
  changes_list TEXT := '';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Tenter de récupérer le nom de l'utilisateur courant
    SELECT nom INTO user_name_val FROM equipe
    WHERE user_id = auth.uid() LIMIT 1;

    -- Vérifier les changements importants
    IF OLD.date IS DISTINCT FROM NEW.date THEN
      changes_list := changes_list || format('Date modifiée: %s → %s. ',
        to_char(OLD.date::date, 'DD/MM/YYYY'),
        to_char(NEW.date::date, 'DD/MM/YYYY'));
    END IF;

    IF OLD.employe_id IS DISTINCT FROM NEW.employe_id THEN
      changes_list := changes_list || 'Employé assigné modifié. ';
    END IF;

    IF OLD.heure_debut IS DISTINCT FROM NEW.heure_debut OR OLD.heure_fin IS DISTINCT FROM NEW.heure_fin THEN
      changes_list := changes_list || 'Horaires modifiés. ';
    END IF;

    -- Si des changements ont été détectés, logger
    IF changes_list != '' THEN
      INSERT INTO intervention_logs (
        intervention_id,
        action,
        details,
        user_name
      ) VALUES (
        NEW.id,
        'Modification',
        changes_list,
        user_name_val
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour les modifications importantes
DROP TRIGGER IF EXISTS trigger_log_job_important_changes ON jobs;
CREATE TRIGGER trigger_log_job_important_changes
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION log_job_important_changes();
