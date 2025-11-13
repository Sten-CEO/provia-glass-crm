-- Storage policies for signatures bucket to allow employee uploads based on assignment
-- and ensure public read access (since bucket is public)

-- 1) Public read access to signatures bucket
DROP POLICY IF EXISTS "Public read access to signatures" ON storage.objects;
CREATE POLICY "Public read access to signatures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures');

-- 2) Allow authenticated employees to upload signatures for jobs they are assigned to
DROP POLICY IF EXISTS "Employees can upload job signatures" ON storage.objects;
CREATE POLICY "Employees can upload job signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT ia.intervention_id
    FROM public.intervention_assignments ia
    JOIN public.equipe e ON e.id = ia.employee_id
    WHERE e.user_id = auth.uid()
  )
);

-- Optional: allow employees to update/delete their uploaded signature files for their assigned jobs
-- Keeping minimal for now; create update/delete if needed later.
