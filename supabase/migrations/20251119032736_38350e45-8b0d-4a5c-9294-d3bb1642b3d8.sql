
-- Step 1: Drop toutes les policies problématiques d'abord
DROP POLICY IF EXISTS "Users can manage their company intervention assignments" ON public.intervention_assignments CASCADE;
DROP POLICY IF EXISTS "Users can view their company intervention assignments" ON public.intervention_assignments CASCADE;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.intervention_assignments CASCADE;
DROP POLICY IF EXISTS "Employees can view their own assignments" ON public.intervention_assignments CASCADE;

DROP POLICY IF EXISTS "Employees can insert files for their interventions" ON public.intervention_files CASCADE;
DROP POLICY IF EXISTS "Employees can view files from their interventions" ON public.intervention_files CASCADE;
DROP POLICY IF EXISTS "Users can manage their company intervention files" ON public.intervention_files CASCADE;
DROP POLICY IF EXISTS "Users can view their company intervention files" ON public.intervention_files CASCADE;

DROP POLICY IF EXISTS "Employees can read their own job_signatures" ON public.job_signatures CASCADE;
DROP POLICY IF EXISTS "Managers can read all job_signatures" ON public.job_signatures CASCADE;
DROP POLICY IF EXISTS "Employees can insert signatures for assigned jobs" ON public.job_signatures CASCADE;
DROP POLICY IF EXISTS "Admins can manage all signatures" ON public.job_signatures CASCADE;
DROP POLICY IF EXISTS "Employees can view signatures from their jobs" ON public.job_signatures CASCADE;

DROP POLICY IF EXISTS "Employees can update their assigned interventions" ON public.jobs CASCADE;
DROP POLICY IF EXISTS "Employees can view assigned interventions" ON public.jobs CASCADE;
