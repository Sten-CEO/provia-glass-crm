-- Add company_id to purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON public.purchase_orders(company_id);

-- Create trigger to auto-populate company_id
CREATE OR REPLACE FUNCTION set_purchase_order_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_purchase_order_company_id ON public.purchase_orders;
CREATE TRIGGER trg_set_purchase_order_company_id
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_purchase_order_company_id();

-- Create RLS policies for purchase_orders
DROP POLICY IF EXISTS "Users can view their company purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can create purchase orders in their company" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update their company purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can delete their company purchase orders" ON public.purchase_orders;

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company purchase orders"
ON public.purchase_orders FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create purchase orders in their company"
ON public.purchase_orders FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company purchase orders"
ON public.purchase_orders FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company purchase orders"
ON public.purchase_orders FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Create RLS policies for material_reservations
DROP POLICY IF EXISTS "Users can view their company material reservations" ON public.material_reservations;
DROP POLICY IF EXISTS "Users can create material reservations in their company" ON public.material_reservations;
DROP POLICY IF EXISTS "Users can update their company material reservations" ON public.material_reservations;
DROP POLICY IF EXISTS "Users can delete their company material reservations" ON public.material_reservations;

ALTER TABLE public.material_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company material reservations"
ON public.material_reservations FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create material reservations in their company"
ON public.material_reservations FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company material reservations"
ON public.material_reservations FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company material reservations"
ON public.material_reservations FOR DELETE TO authenticated
USING (company_id = get_user_company_id());