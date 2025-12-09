-- Test POINT 4 only (support tables)
DO $$
BEGIN
  RAISE NOTICE '=== Testing POINT 4: Support Tables ===';

  -- Test if support_conversations exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_conversations') THEN
    RAISE NOTICE 'support_conversations exists';

    -- Add column
    ALTER TABLE public.support_conversations
      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

    -- Backfill
    UPDATE public.support_conversations sc
    SET company_id = ur.company_id
    FROM public.user_roles ur
    WHERE sc.user_id = ur.user_id
      AND sc.company_id IS NULL;

    RAISE NOTICE 'support_conversations: backfill completed';

    -- Make NOT NULL
    ALTER TABLE public.support_conversations
      ALTER COLUMN company_id SET NOT NULL;

    -- Index
    CREATE INDEX IF NOT EXISTS idx_support_conversations_company_id
      ON public.support_conversations(company_id);

    -- Enable RLS
    ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'support_conversations: ✅ COMPLETED';
  ELSE
    RAISE NOTICE 'support_conversations does not exist - skipping';
  END IF;

  RAISE NOTICE '=== POINT 4: ✅ COMPLETED ===';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'POINT 4: ❌ FAILED - %', SQLERRM;
    RAISE;
END $$;
