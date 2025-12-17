-- Migration: Fix unique constraints to be per company
-- Date: 2025-12-17
-- Description: Change UNIQUE constraints on numero fields from global to per-company
-- This allows each company to have their own numbering sequence (DEV-0001, FAC-0001, etc.)

-- =====================================================
-- DEVIS TABLE
-- =====================================================

-- Drop the global unique constraint on numero
ALTER TABLE public.devis DROP CONSTRAINT IF EXISTS devis_numero_key;

-- Add composite unique constraint (company_id, numero)
-- This allows each company to have DEV-0001, DEV-0002, etc. independently
ALTER TABLE public.devis ADD CONSTRAINT devis_company_numero_unique UNIQUE (company_id, numero);

-- =====================================================
-- FACTURES TABLE
-- =====================================================

-- Drop the global unique constraint on numero
ALTER TABLE public.factures DROP CONSTRAINT IF EXISTS factures_numero_key;

-- Add composite unique constraint (company_id, numero)
ALTER TABLE public.factures ADD CONSTRAINT factures_company_numero_unique UNIQUE (company_id, numero);

-- =====================================================
-- JOBS TABLE (if has intervention_number)
-- =====================================================

-- Check and fix jobs table if it has a unique constraint on intervention_number
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_intervention_number_key'
    AND conrelid = 'public.jobs'::regclass
  ) THEN
    ALTER TABLE public.jobs DROP CONSTRAINT jobs_intervention_number_key;
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_company_intervention_number_unique
      UNIQUE (company_id, intervention_number);
  END IF;
END $$;

-- =====================================================
-- Add indexes for better query performance
-- =====================================================

-- Index for devis lookups by company and numero
CREATE INDEX IF NOT EXISTS idx_devis_company_numero ON public.devis(company_id, numero);

-- Index for factures lookups by company and numero
CREATE INDEX IF NOT EXISTS idx_factures_company_numero ON public.factures(company_id, numero);

-- Comment for documentation
COMMENT ON CONSTRAINT devis_company_numero_unique ON public.devis IS
  'Unique numero per company - allows each company to have independent numbering';
COMMENT ON CONSTRAINT factures_company_numero_unique ON public.factures IS
  'Unique numero per company - allows each company to have independent numbering';
