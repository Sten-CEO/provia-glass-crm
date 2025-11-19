-- Create helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Drop all permissive "public access" policies that don't filter by company_id
DROP POLICY IF EXISTS "Allow public access on agenda_events" ON agenda_events;
DROP POLICY IF EXISTS "Public access on event_assignees" ON event_assignees;
DROP POLICY IF EXISTS "Public access on event_clients" ON event_clients;
DROP POLICY IF EXISTS "Allow public read access on equipe" ON equipe;
DROP POLICY IF EXISTS "Allow public insert access on equipe" ON equipe;
DROP POLICY IF EXISTS "Allow public update access on equipe" ON equipe;
DROP POLICY IF EXISTS "Allow public delete access on equipe" ON equipe;
DROP POLICY IF EXISTS "Allow public delete access on intervention_assignments" ON intervention_assignments;
DROP POLICY IF EXISTS "Allow public read access on intervention_consumables" ON intervention_consumables;
DROP POLICY IF EXISTS "Allow public insert access on intervention_consumables" ON intervention_consumables;
DROP POLICY IF EXISTS "Allow public update access on intervention_consumables" ON intervention_consumables;
DROP POLICY IF EXISTS "Allow public delete access on intervention_consumables" ON intervention_consumables;
DROP POLICY IF EXISTS "Allow public read access on intervention_services" ON intervention_services;
DROP POLICY IF EXISTS "Allow public insert access on intervention_services" ON intervention_services;
DROP POLICY IF EXISTS "Allow public update access on intervention_services" ON intervention_services;
DROP POLICY IF EXISTS "Allow public delete access on intervention_services" ON intervention_services;
DROP POLICY IF EXISTS "Allow public read access on intervention_files" ON intervention_files;
DROP POLICY IF EXISTS "Allow public insert access on intervention_files" ON intervention_files;
DROP POLICY IF EXISTS "Allow public update access on intervention_files" ON intervention_files;
DROP POLICY IF EXISTS "Allow public delete access on intervention_files" ON intervention_files;
DROP POLICY IF EXISTS "Allow public read access on intervention_logs" ON intervention_logs;
DROP POLICY IF EXISTS "Allow public insert access on intervention_logs" ON intervention_logs;
DROP POLICY IF EXISTS "Allow public update access on intervention_logs" ON intervention_logs;
DROP POLICY IF EXISTS "Allow public delete access on intervention_logs" ON intervention_logs;
DROP POLICY IF EXISTS "Allow public read access on intervention_feedback" ON intervention_feedback;
DROP POLICY IF EXISTS "Allow public insert access on intervention_feedback" ON intervention_feedback;
DROP POLICY IF EXISTS "Allow public update access on intervention_feedback" ON intervention_feedback;
DROP POLICY IF EXISTS "Allow public delete access on intervention_feedback" ON intervention_feedback;
DROP POLICY IF EXISTS "Allow public access on dashboard_prefs" ON dashboard_prefs;

-- Create company-scoped RLS policies for agenda_events
CREATE POLICY "Users can view their company agenda events"
  ON agenda_events FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create agenda events in their company"
  ON agenda_events FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company agenda events"
  ON agenda_events FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company agenda events"
  ON agenda_events FOR DELETE
  USING (company_id = get_user_company_id());

-- Create company-scoped RLS policies for event_assignees
CREATE POLICY "Users can view their company event assignees"
  ON event_assignees FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company event assignees"
  ON event_assignees FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Create company-scoped RLS policies for event_clients
CREATE POLICY "Users can view their company event clients"
  ON event_clients FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company event clients"
  ON event_clients FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Create company-scoped RLS policies for equipe
CREATE POLICY "Users can view their company team"
  ON equipe FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create team members in their company"
  ON equipe FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company team"
  ON equipe FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete their company team"
  ON equipe FOR DELETE
  USING (company_id = get_user_company_id());

-- Create company-scoped RLS policies for intervention data
CREATE POLICY "Users can view their company intervention consumables"
  ON intervention_consumables FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention consumables"
  ON intervention_consumables FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can view their company intervention services"
  ON intervention_services FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention services"
  ON intervention_services FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can view their company intervention files"
  ON intervention_files FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention files"
  ON intervention_files FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can view their company intervention logs"
  ON intervention_logs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention logs"
  ON intervention_logs FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can view their company intervention feedback"
  ON intervention_feedback FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention feedback"
  ON intervention_feedback FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can view their company intervention assignments"
  ON intervention_assignments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company intervention assignments"
  ON intervention_assignments FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Create company-scoped RLS policies for dashboard_prefs
CREATE POLICY "Users can view their company dashboard prefs"
  ON dashboard_prefs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company dashboard prefs"
  ON dashboard_prefs FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());