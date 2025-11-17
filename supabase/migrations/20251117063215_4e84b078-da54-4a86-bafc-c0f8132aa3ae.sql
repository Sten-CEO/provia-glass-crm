-- Enable auto-create job on quote acceptance/validation and copy lines server-side

-- 1) Replace the trigger function to also handle 'Validé' and copy lines
CREATE OR REPLACE FUNCTION public.create_job_on_quote_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_job_id uuid;
  v_assignee_name text;
  v_line jsonb;
  v_inventory_item_id uuid;
  v_type text;
  v_qty numeric;
  v_unit text;
  v_unit_price numeric;
  v_tax_rate numeric;
  v_product_name text;
  v_product_ref text;
  v_serial text;
  v_location text;
BEGIN
  -- Create the job only if the option is checked and status is accepted/signed/validated
  IF NEW.auto_create_job_on_accept IS TRUE
     AND NEW.statut IN ('Accepté', 'Signé', 'Validé')
     AND NEW.client_id IS NOT NULL
  THEN
    -- Do nothing if a job already exists for this quote
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE quote_id = NEW.id) THEN
      -- Get assignee name if any
      SELECT nom INTO v_assignee_name FROM public.equipe WHERE id = NEW.assignee_id;

      -- Create the job and capture its id
      INSERT INTO public.jobs (
        titre,
        client_id,
        client_nom,
        employe_id,
        employe_nom,
        assigned_employee_ids,
        date,
        heure_debut,
        heure_fin,
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
        COALESCE(v_assignee_name, ''),
        CASE WHEN NEW.assignee_id IS NOT NULL THEN ARRAY[NEW.assignee_id] ELSE NULL END,
        COALESCE(NEW.planned_date, CURRENT_DATE::text),
        NEW.planned_start_time,
        NEW.planned_end_time,
        'À faire',
        COALESCE(NULLIF(NEW.site_address, ''), NEW.property_address, ''),
        COALESCE(NEW.message_client, NEW.title, ''),
        'Créée automatiquement depuis le devis ' || COALESCE(NEW.numero, ''),
        NEW.id
      ) RETURNING id INTO v_job_id;

      -- Copy consumables/materials lines from quote to intervention if any
      IF v_job_id IS NOT NULL AND NEW.lignes IS NOT NULL AND jsonb_typeof(NEW.lignes) = 'array' THEN
        FOR v_line IN SELECT * FROM jsonb_array_elements(NEW.lignes) LOOP
          v_inventory_item_id := NULLIF(v_line->>'inventory_item_id', '')::uuid;
          v_type := lower(COALESCE(v_line->>'type', v_line->>'category', v_line->>'item_type', ''));
          -- Keep same logic as client: copy if type matches or inventory link exists
          IF v_type IN ('consumable','material','consommable','materiel','matériel') OR v_inventory_item_id IS NOT NULL THEN
            v_product_name := COALESCE(v_line->>'name', v_line->>'designation', '');
            v_product_ref  := COALESCE(v_line->>'reference', '');
            v_qty          := COALESCE((v_line->>'qty')::numeric, (v_line->>'quantite')::numeric, 1);
            v_unit         := COALESCE(v_line->>'unit', v_line->>'unite', 'unité');
            v_unit_price   := COALESCE((v_line->>'unit_price_ht')::numeric, (v_line->>'prix_unitaire')::numeric, 0);
            v_tax_rate     := COALESCE((v_line->>'tva_rate')::numeric, (v_line->>'taux_tva')::numeric, 20);
            v_serial       := NULLIF(v_line->>'serial_number', '');
            v_location     := NULLIF(v_line->>'location', '');

            INSERT INTO public.intervention_consumables (
              intervention_id,
              inventory_item_id,
              product_name,
              product_ref,
              quantity,
              unit,
              unit_price_ht,
              tax_rate,
              serial_number,
              location
            ) VALUES (
              v_job_id,
              v_inventory_item_id,
              v_product_name,
              v_product_ref,
              v_qty,
              v_unit,
              v_unit_price,
              v_tax_rate,
              v_serial,
              v_location
            );
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Create the trigger on quotes to run after updates/inserts
DROP TRIGGER IF EXISTS trg_create_job_on_quote_accept ON public.devis;
CREATE TRIGGER trg_create_job_on_quote_accept
AFTER INSERT OR UPDATE OF statut, auto_create_job_on_accept, planned_date, planned_start_time, planned_end_time, assignee_id
ON public.devis
FOR EACH ROW
EXECUTE FUNCTION public.create_job_on_quote_accept();