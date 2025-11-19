-- Clean up orphaned data without company_id for proper multi-tenant isolation

-- Delete purchase_orders without company_id
DELETE FROM public.purchase_orders WHERE company_id IS NULL;

-- Delete material_reservations that don't belong to valid companies
-- or have NULL company_id
DELETE FROM public.material_reservations 
WHERE company_id IS NULL 
   OR company_id NOT IN (SELECT id FROM public.companies);

-- Make company_id NOT NULL on both tables to prevent future orphans
ALTER TABLE public.purchase_orders 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.material_reservations 
  ALTER COLUMN company_id SET NOT NULL;