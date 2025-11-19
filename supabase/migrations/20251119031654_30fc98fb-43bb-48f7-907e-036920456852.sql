
-- Fix attachments RLS policies
DROP POLICY IF EXISTS "Allow public delete access on attachments" ON public.attachments;
DROP POLICY IF EXISTS "Allow public insert access on attachments" ON public.attachments;
DROP POLICY IF EXISTS "Allow public read access on attachments" ON public.attachments;
DROP POLICY IF EXISTS "Allow public update access on attachments" ON public.attachments;

CREATE POLICY "Users can view their company attachments"
ON public.attachments FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create attachments in their company"
ON public.attachments FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company attachments"
ON public.attachments FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company attachments"
ON public.attachments FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix client_addresses RLS policies
DROP POLICY IF EXISTS "Public access on client_addresses" ON public.client_addresses;

CREATE POLICY "Users can view their company client addresses"
ON public.client_addresses FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create client addresses in their company"
ON public.client_addresses FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company client addresses"
ON public.client_addresses FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company client addresses"
ON public.client_addresses FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix client_contracts RLS policies
DROP POLICY IF EXISTS "Public access on client_contracts" ON public.client_contracts;

CREATE POLICY "Users can view their company client contracts"
ON public.client_contracts FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create client contracts in their company"
ON public.client_contracts FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company client contracts"
ON public.client_contracts FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company client contracts"
ON public.client_contracts FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix contracts RLS policies
DROP POLICY IF EXISTS "Allow public delete access on contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow public insert access on contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow public read access on contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow public update access on contracts" ON public.contracts;

CREATE POLICY "Users can view their company contracts"
ON public.contracts FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create contracts in their company"
ON public.contracts FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company contracts"
ON public.contracts FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company contracts"
ON public.contracts FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix doc_templates RLS policies
DROP POLICY IF EXISTS "Allow public delete access on doc_templates" ON public.doc_templates;
DROP POLICY IF EXISTS "Allow public insert access on doc_templates" ON public.doc_templates;
DROP POLICY IF EXISTS "Allow public read access on doc_templates" ON public.doc_templates;
DROP POLICY IF EXISTS "Allow public update access on doc_templates" ON public.doc_templates;

CREATE POLICY "Users can view their company doc templates"
ON public.doc_templates FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create doc templates in their company"
ON public.doc_templates FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company doc templates"
ON public.doc_templates FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company doc templates"
ON public.doc_templates FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix document_numbering RLS policies
DROP POLICY IF EXISTS "Allow public delete access on document_numbering" ON public.document_numbering;
DROP POLICY IF EXISTS "Allow public insert access on document_numbering" ON public.document_numbering;
DROP POLICY IF EXISTS "Allow public read access on document_numbering" ON public.document_numbering;
DROP POLICY IF EXISTS "Allow public update access on document_numbering" ON public.document_numbering;

CREATE POLICY "Users can view their company document numbering"
ON public.document_numbering FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create document numbering in their company"
ON public.document_numbering FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company document numbering"
ON public.document_numbering FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company document numbering"
ON public.document_numbering FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix inventory_movements RLS policies
DROP POLICY IF EXISTS "Allow public delete access on inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow public insert access on inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow public read access on inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow public update access on inventory_movements" ON public.inventory_movements;

CREATE POLICY "Users can view their company inventory movements"
ON public.inventory_movements FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create inventory movements in their company"
ON public.inventory_movements FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company inventory movements"
ON public.inventory_movements FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company inventory movements"
ON public.inventory_movements FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix inventory_reservations RLS policies
DROP POLICY IF EXISTS "Allow public delete access on inventory_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Allow public insert access on inventory_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Allow public read access on inventory_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Allow public update access on inventory_reservations" ON public.inventory_reservations;

CREATE POLICY "Users can view their company inventory reservations"
ON public.inventory_reservations FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create inventory reservations in their company"
ON public.inventory_reservations FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company inventory reservations"
ON public.inventory_reservations FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company inventory reservations"
ON public.inventory_reservations FOR DELETE TO authenticated
USING (company_id = get_user_company_id());

-- Fix company_settings RLS policies
DROP POLICY IF EXISTS "Anyone can read company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can insert company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can update company settings" ON public.company_settings;

CREATE POLICY "Users can view their company settings"
ON public.company_settings FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create settings for their company"
ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company settings"
ON public.company_settings FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company settings"
ON public.company_settings FOR DELETE TO authenticated
USING (company_id = get_user_company_id());
