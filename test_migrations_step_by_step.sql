-- ========================================
-- DIAGNOSTIC SCRIPT - Test each migration step
-- Run this to identify which exact step causes the uuid=text error
-- ========================================

-- STEP 1: Test paiements backfill
DO $$
BEGIN
  RAISE NOTICE '=== STEP 1: Testing paiements backfill ===';

  UPDATE public.paiements p
  SET company_id = f.company_id
  FROM public.factures f
  WHERE p.facture_id = f.id
    AND p.company_id IS NULL;

  RAISE NOTICE 'STEP 1: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'STEP 1: FAILED - %', SQLERRM;
    RAISE;
END $$;

-- STEP 2: Test quote_events backfill
DO $$
BEGIN
  RAISE NOTICE '=== STEP 2: Testing quote_events backfill ===';

  UPDATE public.quote_events qe
  SET company_id = d.company_id
  FROM public.devis d
  WHERE qe.quote_id = d.id
    AND qe.company_id IS NULL;

  RAISE NOTICE 'STEP 2: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'STEP 2: FAILED - %', SQLERRM;
    RAISE;
END $$;

-- STEP 3: Test quote_signatures backfill
DO $$
BEGIN
  RAISE NOTICE '=== STEP 3: Testing quote_signatures backfill ===';

  UPDATE public.quote_signatures qs
  SET company_id = d.company_id
  FROM public.devis d
  WHERE qs.quote_id = d.id
    AND qs.company_id IS NULL;

  RAISE NOTICE 'STEP 3: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'STEP 3: FAILED - %', SQLERRM;
    RAISE;
END $$;

-- STEP 4: Test notifications backfill from devis
DO $$
BEGIN
  RAISE NOTICE '=== STEP 4: Testing notifications backfill from devis ===';

  UPDATE public.notifications n
  SET company_id = d.company_id
  FROM public.devis d
  WHERE n.link LIKE '/devis/%'
    AND n.link = concat('/devis/', d.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'STEP 4: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'STEP 4: FAILED - %', SQLERRM;
    RAISE;
END $$;

-- STEP 5: Test notifications backfill from factures
DO $$
BEGIN
  RAISE NOTICE '=== STEP 5: Testing notifications backfill from factures ===';

  UPDATE public.notifications n
  SET company_id = f.company_id
  FROM public.factures f
  WHERE n.link LIKE '/factures/%'
    AND n.link = concat('/factures/', f.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'STEP 5: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'STEP 5: FAILED - %', SQLERRM;
    RAISE;
END $$;

-- STEP 6: Test notifications backfill from jobs
DO $$
BEGIN
  RAISE NOTICE '=== STEP 6: Testing notifications backfill from jobs ===';

  UPDATE public.notifications n
  SET company_id = j.company_id
  FROM public.jobs j
  WHERE n.link LIKE '/interventions/%'
    AND n.link = concat('/interventions/', j.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'STEP 6: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'STEP 6: FAILED - %', SQLERRM;
    RAISE;
END $$;

-- STEP 7: Test notifications backfill from agenda
DO $$
BEGIN
  RAISE NOTICE '=== STEP 7: Testing notifications backfill from agenda ===';

  UPDATE public.notifications n
  SET company_id = a.company_id
  FROM public.agenda_events a
  WHERE n.link LIKE '/agenda/%'
    AND n.link = concat('/agenda/', a.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'STEP 7: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'STEP 7: FAILED - %', SQLERRM;
    RAISE;
END $$;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '=== ALL STEPS COMPLETED ===';
END $$;
