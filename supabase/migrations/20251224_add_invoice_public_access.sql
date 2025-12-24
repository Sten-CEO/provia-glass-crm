-- Add columns for public invoice access and signatures

-- Add token and tracking columns to factures
ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Create invoice_signatures table (similar to quote_signatures)
CREATE TABLE IF NOT EXISTS invoice_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_image_url TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_terms BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_invoice_signatures_invoice_id ON invoice_signatures(invoice_id);

-- RLS Policies for invoice_signatures
ALTER TABLE invoice_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on invoice_signatures"
  ON invoice_signatures FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access on invoice_signatures"
  ON invoice_signatures FOR INSERT
  WITH CHECK (true);
