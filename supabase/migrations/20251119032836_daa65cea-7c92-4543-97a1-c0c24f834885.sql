
-- Fix devices_push_tokens
DROP POLICY IF EXISTS "Admins can view all push tokens" ON public.devices_push_tokens;
DROP POLICY IF EXISTS "Employees can manage their own push tokens" ON public.devices_push_tokens;

CREATE POLICY "Users can manage their company push tokens"
ON public.devices_push_tokens FOR ALL TO authenticated
USING (
  company_id = get_user_company_id() AND
  (
    employee_id IN (SELECT id FROM equipe WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  company_id = get_user_company_id() AND
  employee_id IN (SELECT id FROM equipe WHERE user_id = auth.uid())
);

-- Fix support tables (check if they have company_id first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'support_events' AND column_name = 'company_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all events" ON public.support_events';
    EXECUTE 'CREATE POLICY "Users can view their company support events" 
             ON public.support_events FOR SELECT TO authenticated
             USING (company_id = get_user_company_id())';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'company_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets';
    EXECUTE 'CREATE POLICY "Users can manage their company support tickets" 
             ON public.support_tickets FOR ALL TO authenticated
             USING (company_id = get_user_company_id())
             WITH CHECK (company_id = get_user_company_id())';
  END IF;
END $$;

-- Fix timesheet_breaks
DROP POLICY IF EXISTS "Admins can manage all breaks" ON public.timesheet_breaks;
DROP POLICY IF EXISTS "Employees can manage their own breaks" ON public.timesheet_breaks;

CREATE POLICY "Users can manage their company timesheet breaks"
ON public.timesheet_breaks FOR ALL TO authenticated
USING (
  timesheet_entry_id IN (
    SELECT id FROM timesheets_entries WHERE company_id = get_user_company_id()
  )
)
WITH CHECK (
  timesheet_entry_id IN (
    SELECT id FROM timesheets_entries WHERE company_id = get_user_company_id()
  )
);

-- Fix timesheets_entries
DROP POLICY IF EXISTS "Employees can view their own timesheets" ON public.timesheets_entries;
DROP POLICY IF EXISTS "Admins can manage all timesheets" ON public.timesheets_entries;
DROP POLICY IF EXISTS "Employees can manage their own timesheets" ON public.timesheets_entries;

CREATE POLICY "Users can manage their company timesheets"
ON public.timesheets_entries FOR ALL TO authenticated
USING (
  company_id = get_user_company_id() AND
  (
    employee_id IN (SELECT id FROM equipe WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  company_id = get_user_company_id() AND
  (
    employee_id IN (SELECT id FROM equipe WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Fix user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage their company roles"
ON public.user_roles FOR ALL TO authenticated
USING (
  company_id = get_user_company_id() AND
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id = get_user_company_id() AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());
