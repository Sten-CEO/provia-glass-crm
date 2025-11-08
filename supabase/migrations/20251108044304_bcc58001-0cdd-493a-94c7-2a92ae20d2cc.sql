-- Add missing fields to devis table
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS property_address TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS salesperson TEXT,
ADD COLUMN IF NOT EXISTS issued_at DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS converted_to_job_id UUID,
ADD COLUMN IF NOT EXISTS converted_to_invoice_id UUID;

-- Update existing records to have issued_at if null
UPDATE public.devis SET issued_at = CURRENT_DATE WHERE issued_at IS NULL;

-- Add index for faster queries on expiry_date
CREATE INDEX IF NOT EXISTS idx_devis_expiry_date ON public.devis(expiry_date);
CREATE INDEX IF NOT EXISTS idx_devis_status ON public.devis(statut);