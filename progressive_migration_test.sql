-- ========================================
-- PROGRESSIVE MIGRATION SCRIPT
-- Executes migrations one section at a time with error catching
-- ========================================

-- ========================================
-- SECTION 1: PAIEMENTS
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '=== SECTION 1: Starting paiements migration ===';

  -- Add column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.paiements
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE 'SECTION 1: Added company_id column';
  ELSE
    RAISE NOTICE 'SECTION 1: company_id column already exists';
  END IF;

  -- Backfill
  UPDATE public.paiements p
  SET company_id = f.company_id
  FROM public.factures f
  WHERE p.facture_id = f.id
    AND p.company_id IS NULL;

  RAISE NOTICE 'SECTION 1: Backfilled company_id';

  -- Make NOT NULL
  ALTER TABLE public.paiements
    ALTER COLUMN company_id SET NOT NULL;

  RAISE NOTICE 'SECTION 1: Set NOT NULL constraint';

  -- Create index
  CREATE INDEX IF NOT EXISTS idx_paiements_company_id ON public.paiements(company_id);

  -- Enable RLS
  ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE 'SECTION 1: ✅ COMPLETED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'SECTION 1: ❌ FAILED - %', SQLERRM;
    RAISE;
END $$;

-- ========================================
-- SECTION 2: QUOTE_EVENTS
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '=== SECTION 2: Starting quote_events migration ===';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_events' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.quote_events
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE 'SECTION 2: Added company_id column';
  ELSE
    RAISE NOTICE 'SECTION 2: company_id column already exists';
  END IF;

  UPDATE public.quote_events qe
  SET company_id = d.company_id
  FROM public.devis d
  WHERE qe.quote_id = d.id
    AND qe.company_id IS NULL;

  ALTER TABLE public.quote_events
    ALTER COLUMN company_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_quote_events_company_id ON public.quote_events(company_id);
  ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE 'SECTION 2: ✅ COMPLETED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'SECTION 2: ❌ FAILED - %', SQLERRM;
    RAISE;
END $$;

-- ========================================
-- SECTION 3: QUOTE_SIGNATURES
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '=== SECTION 3: Starting quote_signatures migration ===';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_signatures' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.quote_signatures
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE 'SECTION 3: Added company_id column';
  ELSE
    RAISE NOTICE 'SECTION 3: company_id column already exists';
  END IF;

  UPDATE public.quote_signatures qs
  SET company_id = d.company_id
  FROM public.devis d
  WHERE qs.quote_id = d.id
    AND qs.company_id IS NULL;

  ALTER TABLE public.quote_signatures
    ALTER COLUMN company_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_quote_signatures_company_id ON public.quote_signatures(company_id);
  ALTER TABLE public.quote_signatures ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE 'SECTION 3: ✅ COMPLETED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'SECTION 3: ❌ FAILED - %', SQLERRM;
    RAISE;
END $$;

-- ========================================
-- SECTION 4: NOTIFICATIONS TABLE STRUCTURE
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '=== SECTION 4: Starting notifications table structure ===';

  -- Remove employee_id if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE public.notifications DROP COLUMN employee_id CASCADE;
    RAISE NOTICE 'SECTION 4: Dropped employee_id column';
  END IF;

  -- Add company_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE 'SECTION 4: Added company_id column';
  ELSE
    RAISE NOTICE 'SECTION 4: company_id column already exists';
  END IF;

  RAISE NOTICE 'SECTION 4: ✅ COMPLETED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'SECTION 4: ❌ FAILED - %', SQLERRM;
    RAISE;
END $$;

-- ========================================
-- SECTION 5: NOTIFICATIONS BACKFILL
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '=== SECTION 5: Starting notifications backfill ===';

  -- From devis
  UPDATE public.notifications n
  SET company_id = d.company_id
  FROM public.devis d
  WHERE n.link LIKE '/devis/%'
    AND n.link = concat('/devis/', d.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'SECTION 5: Backfilled from devis';

  -- From factures
  UPDATE public.notifications n
  SET company_id = f.company_id
  FROM public.factures f
  WHERE n.link LIKE '/factures/%'
    AND n.link = concat('/factures/', f.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'SECTION 5: Backfilled from factures';

  -- From jobs
  UPDATE public.notifications n
  SET company_id = j.company_id
  FROM public.jobs j
  WHERE n.link LIKE '/interventions/%'
    AND n.link = concat('/interventions/', j.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'SECTION 5: Backfilled from jobs';

  -- From agenda
  UPDATE public.notifications n
  SET company_id = a.company_id
  FROM public.agenda_events a
  WHERE n.link LIKE '/agenda/%'
    AND n.link = concat('/agenda/', a.id::text)
    AND n.company_id IS NULL;

  RAISE NOTICE 'SECTION 5: Backfilled from agenda';

  -- Make NOT NULL
  ALTER TABLE public.notifications
    ALTER COLUMN company_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);

  RAISE NOTICE 'SECTION 5: ✅ COMPLETED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'SECTION 5: ❌ FAILED - %', SQLERRM;
    RAISE;
END $$;

DO $$
BEGIN
  RAISE NOTICE '=== ✅ ALL SECTIONS COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'Run the full apply_all_migrations.sql script now.';
END $$;
