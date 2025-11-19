-- Create helper function to get current user's company_id
create or replace function public.get_user_company_id()
returns uuid
language sql
stable security definer
set search_path = public
as $$
  select company_id 
  from public.user_roles 
  where user_id = auth.uid() 
  limit 1;
$$;

-- Update RLS policies for clients table
drop policy if exists "Allow public read access on clients" on public.clients;
drop policy if exists "Allow public insert access on clients" on public.clients;
drop policy if exists "Allow public update access on clients" on public.clients;
drop policy if exists "Allow public delete access on clients" on public.clients;

create policy "Users can view their company clients"
on public.clients for select
using (company_id = get_user_company_id());

create policy "Users can create clients in their company"
on public.clients for insert
with check (company_id = get_user_company_id());

create policy "Users can update their company clients"
on public.clients for update
using (company_id = get_user_company_id());

create policy "Users can delete their company clients"
on public.clients for delete
using (company_id = get_user_company_id());

-- Update RLS policies for devis table
drop policy if exists "Allow public read access on devis" on public.devis;
drop policy if exists "Allow public insert access on devis" on public.devis;
drop policy if exists "Allow public update access on devis" on public.devis;
drop policy if exists "Allow public delete access on devis" on public.devis;

create policy "Users can view their company quotes"
on public.devis for select
using (company_id = get_user_company_id());

create policy "Users can create quotes in their company"
on public.devis for insert
with check (company_id = get_user_company_id());

create policy "Users can update their company quotes"
on public.devis for update
using (company_id = get_user_company_id());

create policy "Users can delete their company quotes"
on public.devis for delete
using (company_id = get_user_company_id());

-- Update RLS policies for factures table
drop policy if exists "Allow public read access on factures" on public.factures;
drop policy if exists "Allow public insert access on factures" on public.factures;
drop policy if exists "Allow public update access on factures" on public.factures;
drop policy if exists "Allow public delete access on factures" on public.factures;

create policy "Users can view their company invoices"
on public.factures for select
using (company_id = get_user_company_id());

create policy "Users can create invoices in their company"
on public.factures for insert
with check (company_id = get_user_company_id());

create policy "Users can update their company invoices"
on public.factures for update
using (company_id = get_user_company_id());

create policy "Users can delete their company invoices"
on public.factures for delete
using (company_id = get_user_company_id());

-- Update RLS policies for jobs table
drop policy if exists "Allow public read access on jobs" on public.jobs;
drop policy if exists "Allow public insert access on jobs" on public.jobs;
drop policy if exists "Allow public update access on jobs" on public.jobs;
drop policy if exists "Allow public delete access on jobs" on public.jobs;

create policy "Users can view their company interventions"
on public.jobs for select
using (company_id = get_user_company_id());

create policy "Users can create interventions in their company"
on public.jobs for insert
with check (company_id = get_user_company_id());

create policy "Users can update their company interventions"
on public.jobs for update
using (company_id = get_user_company_id());

create policy "Users can delete their company interventions"
on public.jobs for delete
using (company_id = get_user_company_id());

-- Update RLS policies for inventory_items table
drop policy if exists "Allow public read access on inventory_items" on public.inventory_items;
drop policy if exists "Allow public insert access on inventory_items" on public.inventory_items;
drop policy if exists "Allow public update access on inventory_items" on public.inventory_items;
drop policy if exists "Allow public delete access on inventory_items" on public.inventory_items;

create policy "Users can view their company inventory"
on public.inventory_items for select
using (company_id = get_user_company_id());

create policy "Users can create inventory in their company"
on public.inventory_items for insert
with check (company_id = get_user_company_id());

create policy "Users can update their company inventory"
on public.inventory_items for update
using (company_id = get_user_company_id());

create policy "Users can delete their company inventory"
on public.inventory_items for delete
using (company_id = get_user_company_id());