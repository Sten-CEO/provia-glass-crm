-- Fix job_signatures RLS policies to check company_id

-- Drop old policies
DROP POLICY IF EXISTS "Employees can insert their own job_signatures" ON public.job_signatures;
DROP POLICY IF EXISTS "Employees can read their own job_signatures" ON public.job_signatures;
DROP POLICY IF EXISTS "Managers can read all job_signatures" ON public.job_signatures;

-- Create new policy for employees to insert signatures in their company
CREATE POLICY "Employees can insert job_signatures in their company"
ON public.job_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id() AND
  employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
);

-- Create new policy for employees to read signatures in their company
CREATE POLICY "Employees can read job_signatures in their company"
ON public.job_signatures
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id() AND
  employee_id IN (SELECT id FROM public.equipe WHERE user_id = auth.uid())
);

-- Create new policy for managers to read all signatures in their company
CREATE POLICY "Managers can read all job_signatures in their company"
ON public.job_signatures
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id() AND
  EXISTS (
    SELECT 1 FROM public.equipe e
    WHERE e.user_id = auth.uid()
    AND e.company_id = get_user_company_id()
    AND COALESCE(e.is_manager, false) = true
  )
);
