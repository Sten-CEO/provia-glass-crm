-- Relax overly restrictive notifications.type check to allow app-defined event types
DO $$ BEGIN
  -- Drop old constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'notifications_type_check' AND t.relname = 'notifications'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Recreate a safer check: allow NULL or any non-empty string (validation should live in triggers/app code)
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IS NULL OR char_length(type) > 0);

-- Optional: also ensure kind follows same minimal rule (prevents similar future errors)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'notifications_kind_check' AND t.relname = 'notifications'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_kind_check CHECK (kind IS NULL OR char_length(kind) > 0);
  END IF;
END $$;