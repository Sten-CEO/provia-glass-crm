-- Créer les buckets Storage nécessaires
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job-signatures', 'job-signatures', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('intervention-photos', 'intervention-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques pour job-signatures
CREATE POLICY "Public can view signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-signatures');

CREATE POLICY "Employees can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-signatures' AND auth.role() = 'authenticated');

CREATE POLICY "Employees can update their signatures"
ON storage.objects FOR UPDATE
USING (bucket_id = 'job-signatures' AND auth.role() = 'authenticated');

-- Politiques pour intervention-photos
CREATE POLICY "Public can view intervention photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'intervention-photos');

CREATE POLICY "Employees can upload intervention photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'intervention-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Employees can update their photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'intervention-photos' AND auth.role() = 'authenticated');