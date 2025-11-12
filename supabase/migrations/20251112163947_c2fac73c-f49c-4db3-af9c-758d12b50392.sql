-- Enable RLS for job_signatures and add policies for employees/managers

-- Ensure RLS is enabled
ALTER TABLE public.job_signatures ENABLE ROW LEVEL SECURITY;

-- Employees can insert their own signatures
CREATE POLICY "Employees can insert their own job_signatures"
ON public.job_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = (
    SELECT e.id FROM public.equipe e WHERE e.user_id = auth.uid()
  )
);

-- Employees can read their own signatures
CREATE POLICY "Employees can read their own job_signatures"
ON public.job_signatures
FOR SELECT
TO authenticated
USING (
  employee_id = (
    SELECT e.id FROM public.equipe e WHERE e.user_id = auth.uid()
  )
);

-- Managers can read all signatures
CREATE POLICY "Managers can read all job_signatures"
ON public.job_signatures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.equipe e
    WHERE e.user_id = auth.uid() AND COALESCE(e.is_manager, false) = true
  )
);
