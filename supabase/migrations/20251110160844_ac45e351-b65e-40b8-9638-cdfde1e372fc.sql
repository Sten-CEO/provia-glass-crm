-- Améliorer le trigger pour ne pas bloquer les changements de statut
CREATE OR REPLACE FUNCTION public.create_job_on_quote_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer l'intervention si l'option est activée et le devis est accepté ou signé
  IF NEW.auto_create_job_on_accept IS TRUE
     AND NEW.statut IN ('Accepté', 'Signé')
     AND NEW.client_id IS NOT NULL
  THEN
    -- Ne rien faire si une intervention existe déjà pour ce devis
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE quote_id = NEW.id) THEN
      -- Wrapper dans un bloc EXCEPTION pour ne pas bloquer l'UPDATE du devis en cas d'erreur
      BEGIN
        INSERT INTO public.jobs (
          titre,
          client_id,
          client_nom,
          employe_id,
          employe_nom,
          assigned_employee_ids,
          date,
          heure_debut,
          statut,
          adresse,
          description,
          notes,
          quote_id
        ) VALUES (
          COALESCE(NEW.title, 'Intervention suite au devis ' || COALESCE(NEW.numero, '')),
          NEW.client_id,
          COALESCE(NEW.client_nom, ''),
          NEW.assignee_id,
          COALESCE((SELECT nom FROM public.equipe WHERE id = NEW.assignee_id), ''),
          CASE WHEN NEW.assignee_id IS NOT NULL THEN ARRAY[NEW.assignee_id] ELSE NULL END,
          COALESCE(NEW.planned_date, CURRENT_DATE::text),
          NEW.planned_start_time,
          'À faire',
          COALESCE(NULLIF(NEW.site_address, ''), NEW.property_address, ''),
          COALESCE(NEW.message_client, NEW.title, ''),
          'Créée automatiquement depuis le devis ' || COALESCE(NEW.numero, ''),
          NEW.id
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Log l'erreur mais ne bloque pas l'UPDATE du devis
          RAISE WARNING 'Erreur lors de la création automatique de l''intervention: %', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;