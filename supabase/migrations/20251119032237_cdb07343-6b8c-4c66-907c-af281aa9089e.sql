
-- Backfill service_items avec company_id
UPDATE public.service_items
SET company_id = '5b6122af-959d-479d-b5b6-4e1dde5fa8ff'
WHERE company_id IS NULL;

-- Fix service_items RLS policies
DROP POLICY IF EXISTS "Allow public read access on service_items" ON public.service_items;
DROP POLICY IF EXISTS "Allow public insert access on service_items" ON public.service_items;
DROP POLICY IF EXISTS "Allow public update access on service_items" ON public.service_items;
DROP POLICY IF EXISTS "Allow public delete access on service_items" ON public.service_items;

CREATE POLICY "Users can view their company service items"
ON public.service_items FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create service items in their company"
ON public.service_items FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company service items"
ON public.service_items FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company service items"
ON public.service_items FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Add trigger for auto-population
CREATE TRIGGER set_company_id_trigger
BEFORE INSERT ON public.service_items
FOR EACH ROW EXECUTE FUNCTION public.set_company_id();
