-- POINT 7: Audit and fix missing/incomplete RLS policies
-- Ensure all tables have proper company-scoped RLS policies

-- ========================================
-- 1. USER_DISPLAY_SETTINGS
-- ========================================

-- Enable RLS if not already enabled
ALTER TABLE public.user_display_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own display settings" ON public.user_display_settings;

-- Create policy: users can only manage their own settings
CREATE POLICY "Users can manage their own display settings"
  ON public.user_display_settings FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ========================================
-- 2. ATTACHMENTS
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can manage their company attachments" ON public.attachments;

-- Create proper company-scoped policies
CREATE POLICY "Users can view their company attachments"
  ON public.attachments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company attachments"
  ON public.attachments FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 3. CLIENT_ADDRESSES
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company client addresses" ON public.client_addresses;
DROP POLICY IF EXISTS "Users can manage their company client addresses" ON public.client_addresses;

-- Create proper company-scoped policies
CREATE POLICY "Users can view their company client addresses"
  ON public.client_addresses FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company client addresses"
  ON public.client_addresses FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 4. CLIENT_CONTRACTS
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company client contracts" ON public.client_contracts;
DROP POLICY IF EXISTS "Users can manage their company client contracts" ON public.client_contracts;

-- Create proper company-scoped policies
CREATE POLICY "Users can view their company client contracts"
  ON public.client_contracts FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company client contracts"
  ON public.client_contracts FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 5. DEVICES_PUSH_TOKENS (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices_push_tokens') THEN
    -- Enable RLS
    ALTER TABLE public.devices_push_tokens ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their company devices" ON public.devices_push_tokens;
    DROP POLICY IF EXISTS "Users can manage their company devices" ON public.devices_push_tokens;

    -- Create proper company-scoped policies
    CREATE POLICY "Users can view their company devices"
      ON public.devices_push_tokens FOR SELECT
      USING (company_id = get_user_company_id());

    CREATE POLICY "Users can manage their company devices"
      ON public.devices_push_tokens FOR ALL
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
END $$;

-- ========================================
-- 6. PURCHASE_ORDERS (if exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    -- Ensure RLS is enabled
    ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their company purchase orders" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Users can manage their company purchase orders" ON public.purchase_orders;

    -- Create proper company-scoped policies
    CREATE POLICY "Users can view their company purchase orders"
      ON public.purchase_orders FOR SELECT
      USING (company_id = get_user_company_id());

    CREATE POLICY "Users can manage their company purchase orders"
      ON public.purchase_orders FOR ALL
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  END IF;
END $$;

-- ========================================
-- 7. MATERIAL_RESERVATIONS
-- ========================================

-- Ensure proper policies exist for material_reservations
DROP POLICY IF EXISTS "Users can view their company material reservations" ON public.material_reservations;
DROP POLICY IF EXISTS "Users can manage their company material reservations" ON public.material_reservations;

CREATE POLICY "Users can view their company material reservations"
  ON public.material_reservations FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company material reservations"
  ON public.material_reservations FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 8. COMPANY_SETTINGS - SPECIAL CASE
-- ========================================

-- Company settings should only be accessible by users in that company
DROP POLICY IF EXISTS "Users can view their company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their company settings" ON public.company_settings;

CREATE POLICY "Users can view their company settings"
  ON public.company_settings FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can update their company settings"
  ON public.company_settings FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can insert their company settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- ========================================
-- 9. PROFILES - NO COMPANY_ID NEEDED
-- ========================================

-- Profiles are auth-level and don't need company_id
-- But ensure RLS is properly configured
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
