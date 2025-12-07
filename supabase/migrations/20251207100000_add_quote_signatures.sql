-- Migration: Add quote signatures table
-- Date: 2025-12-07
-- Description: Store electronic signatures for quotes

-- Create quote_signatures table
CREATE TABLE IF NOT EXISTS public.quote_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quote_signatures_quote_id ON public.quote_signatures(quote_id);

-- Add RLS policies (public access for signing)
ALTER TABLE public.quote_signatures ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert signatures (public signing)
CREATE POLICY "Allow public quote signing"
  ON public.quote_signatures
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own company's quote signatures
CREATE POLICY "Allow viewing company quote signatures"
  ON public.quote_signatures
  FOR SELECT
  USING (
    quote_id IN (
      SELECT id FROM public.devis
      WHERE company_id IN (
        SELECT company_id FROM public.user_roles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add comment
COMMENT ON TABLE public.quote_signatures IS 'Stores electronic signatures for quotes';
