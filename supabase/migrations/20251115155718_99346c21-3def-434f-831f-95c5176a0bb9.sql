-- Remove duplicate trigger that creates double notifications on quote updates
DROP TRIGGER IF EXISTS on_quote_signed ON public.devis;

-- Keep a single standardized trigger if missing (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'devis' AND t.tgname = 'trigger_notify_quote_signed'
  ) THEN
    CREATE TRIGGER trigger_notify_quote_signed
    AFTER UPDATE ON public.devis
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_quote_signed();
  END IF;
END $$;