-- Fix RLS policies for job_signatures table to allow employee signature insertion

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Employees can insert their own job_signatures" ON job_signatures;
DROP POLICY IF EXISTS "Employees can create signatures for their jobs" ON job_signatures;

-- Create permissive policy for employees to insert signatures for their assigned jobs
CREATE POLICY "Employees can insert signatures for assigned jobs"
ON job_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if the employee is assigned to this job
  EXISTS (
    SELECT 1 
    FROM intervention_assignments ia
    JOIN equipe e ON e.id = ia.employee_id
    WHERE ia.intervention_id = job_id
    AND e.user_id = auth.uid()
  )
);

-- Also update jobs table RLS to allow employees to update signature fields
DROP POLICY IF EXISTS "Employees can update their assigned interventions" ON jobs;

CREATE POLICY "Employees can update their assigned interventions"
ON jobs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    JOIN equipe e ON e.id = ia.employee_id
    WHERE ia.intervention_id = jobs.id
    AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    JOIN equipe e ON e.id = ia.employee_id
    WHERE ia.intervention_id = jobs.id
    AND e.user_id = auth.uid()
  )
);