-- Create job_signatures table for client signatures
CREATE TABLE IF NOT EXISTS public.job_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.equipe(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  image_url TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create devices_push_tokens table for push notifications
CREATE TABLE IF NOT EXISTS public.devices_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.equipe(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, token)
);

-- Enable RLS on job_signatures
ALTER TABLE public.job_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_signatures
CREATE POLICY "Employees can view signatures from their jobs"
ON public.job_signatures
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM equipe WHERE user_id = auth.uid()
  )
  OR
  job_id IN (
    SELECT ia.intervention_id 
    FROM intervention_assignments ia
    JOIN equipe e ON e.id = ia.employee_id
    WHERE e.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
  OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Employees can create signatures for their jobs"
ON public.job_signatures
FOR INSERT
WITH CHECK (
  job_id IN (
    SELECT ia.intervention_id 
    FROM intervention_assignments ia
    JOIN equipe e ON e.id = ia.employee_id
    WHERE e.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all signatures"
ON public.job_signatures
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- Enable RLS on devices_push_tokens
ALTER TABLE public.devices_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices_push_tokens
CREATE POLICY "Employees can manage their own push tokens"
ON public.devices_push_tokens
FOR ALL
USING (
  employee_id IN (
    SELECT id FROM equipe WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM equipe WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all push tokens"
ON public.devices_push_tokens
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- Update intervention_files to better support job photos
ALTER TABLE public.intervention_files
ADD COLUMN IF NOT EXISTS photo_type TEXT CHECK (photo_type IN ('before', 'after', 'other'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_signatures_job_id ON public.job_signatures(job_id);
CREATE INDEX IF NOT EXISTS idx_job_signatures_employee_id ON public.job_signatures(employee_id);
CREATE INDEX IF NOT EXISTS idx_devices_push_tokens_employee_id ON public.devices_push_tokens(employee_id);
CREATE INDEX IF NOT EXISTS idx_intervention_files_photo_type ON public.intervention_files(photo_type) WHERE photo_type IS NOT NULL;