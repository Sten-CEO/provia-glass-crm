-- Test if the concat comparison works
-- This will identify if concat() is the problem

-- Test 1: Simple concat with uuid cast
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 1: concat with uuid::text ===';

  SELECT COUNT(*)
  INTO test_count
  FROM public.notifications n
  JOIN public.devis d ON n.link = concat('/devis/', d.id::text)
  WHERE n.link LIKE '/devis/%';

  RAISE NOTICE 'TEST 1: SUCCESS - Found % matches', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'TEST 1: FAILED - %', SQLERRM;
END $$;

-- Test 2: Using string concatenation operator
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 2: Using || operator with explicit text cast ===';

  SELECT COUNT(*)
  INTO test_count
  FROM public.notifications n
  JOIN public.devis d ON n.link = ('/devis/' || d.id::text)
  WHERE n.link LIKE '/devis/%';

  RAISE NOTICE 'TEST 2: SUCCESS - Found % matches', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'TEST 2: FAILED - %', SQLERRM;
END $$;

-- Test 3: Using format function
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 3: Using format() function ===';

  SELECT COUNT(*)
  INTO test_count
  FROM public.notifications n
  JOIN public.devis d ON n.link = format('/devis/%s', d.id)
  WHERE n.link LIKE '/devis/%';

  RAISE NOTICE 'TEST 3: SUCCESS - Found % matches', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'TEST 3: FAILED - %', SQLERRM;
END $$;

DO $$
BEGIN
  RAISE NOTICE '=== TESTS COMPLETED ===';
END $$;
