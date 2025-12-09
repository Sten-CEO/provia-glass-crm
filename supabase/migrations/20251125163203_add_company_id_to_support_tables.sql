-- POINT 4: Add company_id to support tables
-- Support conversations and messages must be isolated per company

-- ========================================
-- 1. SUPPORT_CONVERSATIONS TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from user_roles
UPDATE public.support_conversations sc
SET company_id = ur.company_id
FROM public.user_roles ur
WHERE sc.user_id = ur.user_id
  AND sc.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.support_conversations
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_support_conversations_company_id
  ON public.support_conversations(company_id);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their company conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.support_conversations;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view their company conversations"
  ON public.support_conversations FOR SELECT
  USING (company_id = get_user_company_id() OR user_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON public.support_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Users can update their conversations"
  ON public.support_conversations FOR UPDATE
  USING (user_id = auth.uid() AND company_id = get_user_company_id());

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_support_conversations_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_support_conversations_company_id ON public.support_conversations;
CREATE TRIGGER trigger_set_support_conversations_company_id
  BEFORE INSERT ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_support_conversations_company_id();

-- ========================================
-- 2. SUPPORT_MESSAGES TABLE
-- ========================================

-- Add company_id column
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from parent conversation
UPDATE public.support_messages sm
SET company_id = sc.company_id
FROM public.support_conversations sc
WHERE sm.conversation_id = sc.id
  AND sm.company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE public.support_messages
  ALTER COLUMN company_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_support_messages_company_id
  ON public.support_messages(company_id);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.support_messages;

-- Create company-scoped RLS policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.support_messages FOR SELECT
  USING (
    company_id = get_user_company_id() OR
    conversation_id IN (
      SELECT id FROM public.support_conversations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id() AND
    conversation_id IN (
      SELECT id FROM public.support_conversations
      WHERE user_id = auth.uid()
    )
  );

-- Add trigger to auto-set company_id on INSERT
CREATE OR REPLACE FUNCTION set_support_messages_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.support_conversations
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_support_messages_company_id ON public.support_messages;
CREATE TRIGGER trigger_set_support_messages_company_id
  BEFORE INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_support_messages_company_id();

-- ========================================
-- 3. SUPPORT_TICKETS TABLE (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    -- Add company_id column
    ALTER TABLE public.support_tickets
      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

    -- Backfill from equipe
    UPDATE public.support_tickets st
    SET company_id = e.company_id
    FROM public.equipe e
    WHERE st.employee_id = e.id
      AND st.company_id IS NULL;

    -- Make company_id NOT NULL
    ALTER TABLE public.support_tickets
      ALTER COLUMN company_id SET NOT NULL;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id
      ON public.support_tickets(company_id);

    -- Enable RLS
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

    -- Create policies
    DROP POLICY IF EXISTS "Users can view their company tickets" ON public.support_tickets;
    CREATE POLICY "Users can view their company tickets"
      ON public.support_tickets FOR SELECT
      USING (company_id = get_user_company_id());

    DROP POLICY IF EXISTS "Users can manage their company tickets" ON public.support_tickets;
    CREATE POLICY "Users can manage their company tickets"
      ON public.support_tickets FOR ALL
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
END $$;

-- ========================================
-- 4. SUPPORT_EVENTS TABLE (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_events') THEN
    -- Add company_id column
    ALTER TABLE public.support_events
      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

    -- Backfill from equipe if employee_id exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'support_events' AND column_name = 'employee_id'
    ) THEN
      UPDATE public.support_events se
      SET company_id = e.company_id
      FROM public.equipe e
      WHERE se.employee_id = e.id
        AND se.company_id IS NULL;
    END IF;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_support_events_company_id
      ON public.support_events(company_id);

    -- Enable RLS
    ALTER TABLE public.support_events ENABLE ROW LEVEL SECURITY;

    -- Create policies
    DROP POLICY IF EXISTS "Users can view their company events" ON public.support_events;
    CREATE POLICY "Users can view their company events"
      ON public.support_events FOR SELECT
      USING (company_id = get_user_company_id() OR company_id IS NULL);

    DROP POLICY IF EXISTS "Users can manage their company events" ON public.support_events;
    CREATE POLICY "Users can manage their company events"
      ON public.support_events FOR ALL
      USING (company_id = get_user_company_id() OR company_id IS NULL)
      WITH CHECK (company_id = get_user_company_id() OR company_id IS NULL);
  END IF;
END $$;
