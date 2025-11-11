-- Create intervention_logs table for tracking all actions
CREATE TABLE IF NOT EXISTS public.intervention_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intervention_feedback table for client satisfaction
CREATE TABLE IF NOT EXISTS public.intervention_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  signer_name TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.intervention_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intervention_logs
CREATE POLICY "Allow public read access on intervention_logs"
  ON public.intervention_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on intervention_logs"
  ON public.intervention_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on intervention_logs"
  ON public.intervention_logs FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on intervention_logs"
  ON public.intervention_logs FOR DELETE
  USING (true);

-- RLS Policies for intervention_feedback
CREATE POLICY "Allow public read access on intervention_feedback"
  ON public.intervention_feedback FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on intervention_feedback"
  ON public.intervention_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on intervention_feedback"
  ON public.intervention_feedback FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access on intervention_feedback"
  ON public.intervention_feedback FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_intervention_logs_intervention_id ON public.intervention_logs(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_logs_created_at ON public.intervention_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intervention_feedback_intervention_id ON public.intervention_feedback(intervention_id);