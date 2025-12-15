-- Migration: Add company_id triggers for inventory tables
-- These tables were missing auto-set company_id triggers

-- ========================================
-- 1. INVENTORY_ITEMS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_inventory_items_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_inventory_items_company_id ON public.inventory_items;
CREATE TRIGGER trigger_set_inventory_items_company_id
  BEFORE INSERT ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION set_inventory_items_company_id();

-- ========================================
-- 2. INVENTORY_MOVEMENTS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_inventory_movements_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_inventory_movements_company_id ON public.inventory_movements;
CREATE TRIGGER trigger_set_inventory_movements_company_id
  BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION set_inventory_movements_company_id();

-- ========================================
-- 3. INVENTORY_RESERVATIONS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_inventory_reservations_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_inventory_reservations_company_id ON public.inventory_reservations;
CREATE TRIGGER trigger_set_inventory_reservations_company_id
  BEFORE INSERT ON public.inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_inventory_reservations_company_id();

-- ========================================
-- 4. MATERIAL_RESERVATIONS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_material_reservations_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_material_reservations_company_id ON public.material_reservations;
CREATE TRIGGER trigger_set_material_reservations_company_id
  BEFORE INSERT ON public.material_reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_material_reservations_company_id();

-- ========================================
-- 5. PURCHASE_ORDERS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_purchase_orders_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_purchase_orders_company_id ON public.purchase_orders;
CREATE TRIGGER trigger_set_purchase_orders_company_id
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_purchase_orders_company_id();

-- ========================================
-- 6. SERVICE_ITEMS TABLE
-- ========================================

CREATE OR REPLACE FUNCTION set_service_items_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_service_items_company_id ON public.service_items;
CREATE TRIGGER trigger_set_service_items_company_id
  BEFORE INSERT ON public.service_items
  FOR EACH ROW
  EXECUTE FUNCTION set_service_items_company_id();

-- ========================================
-- 7. DROP LEGACY PUBLIC ACCESS POLICIES
-- ========================================

-- inventory_items
DROP POLICY IF EXISTS "Allow public read access on inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow public insert access on inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow public update access on inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow public delete access on inventory_items" ON public.inventory_items;

-- inventory_movements
DROP POLICY IF EXISTS "Allow public read access on inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow public insert access on inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow public update access on inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow public delete access on inventory_movements" ON public.inventory_movements;

-- purchase_orders
DROP POLICY IF EXISTS "Allow public read access on purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public insert access on purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public update access on purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public delete access on purchase_orders" ON public.purchase_orders;

-- timesheets_entries
DROP POLICY IF EXISTS "Allow public read access on timesheets_entries" ON public.timesheets_entries;
DROP POLICY IF EXISTS "Allow public insert access on timesheets_entries" ON public.timesheets_entries;
DROP POLICY IF EXISTS "Allow public update access on timesheets_entries" ON public.timesheets_entries;
DROP POLICY IF EXISTS "Allow public delete access on timesheets_entries" ON public.timesheets_entries;

-- ========================================
-- 8. CREATE COMPANY-SCOPED RLS POLICIES
-- ========================================

-- inventory_items
CREATE POLICY "Users can view their company inventory items"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company inventory items"
  ON public.inventory_items FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- inventory_movements
CREATE POLICY "Users can view their company inventory movements"
  ON public.inventory_movements FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company inventory movements"
  ON public.inventory_movements FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- purchase_orders (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    EXECUTE 'CREATE POLICY "Users can view their company purchase orders"
      ON public.purchase_orders FOR SELECT
      TO authenticated
      USING (company_id = get_user_company_id())';

    EXECUTE 'CREATE POLICY "Users can manage their company purchase orders"
      ON public.purchase_orders FOR ALL
      TO authenticated
      USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id())';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION set_inventory_items_company_id() IS
'Auto-sets company_id from the authenticated user when inserting an inventory item';

COMMENT ON FUNCTION set_inventory_movements_company_id() IS
'Auto-sets company_id from the authenticated user when inserting an inventory movement';

COMMENT ON FUNCTION set_purchase_orders_company_id() IS
'Auto-sets company_id from the authenticated user when inserting a purchase order';
