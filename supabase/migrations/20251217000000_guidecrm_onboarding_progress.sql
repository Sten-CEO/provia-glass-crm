-- =========================================
-- GUIDECRM: Onboarding Progress Table
-- =========================================
-- This migration creates the onboarding_progress table for the gamified onboarding system.
-- The table tracks user progress through the 7 onboarding steps.

-- Create the onboarding_progress table
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    -- Step 1: Company settings filled
    company_done BOOLEAN DEFAULT FALSE,

    -- Step 2: Templates created (need both quote AND invoice template)
    template_quote_done BOOLEAN DEFAULT FALSE,
    template_invoice_done BOOLEAN DEFAULT FALSE,

    -- Step 3: Client created
    client_done BOOLEAN DEFAULT FALSE,

    -- Step 4: Quote created
    quote_done BOOLEAN DEFAULT FALSE,

    -- Step 5: Invoice created
    invoice_done BOOLEAN DEFAULT FALSE,

    -- Step 6: Team member added
    member_done BOOLEAN DEFAULT FALSE,

    -- Step 7: Inventory item added
    inventory_done BOOLEAN DEFAULT FALSE,

    -- Completion timestamp (set when all steps are done)
    completed_at TIMESTAMPTZ DEFAULT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one record per user per company
    UNIQUE(user_id, company_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company_id ON public.onboarding_progress(company_id);

-- Enable RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own onboarding progress
CREATE POLICY "Users can view own onboarding progress"
    ON public.onboarding_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own onboarding progress
CREATE POLICY "Users can insert own onboarding progress"
    ON public.onboarding_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own onboarding progress
CREATE POLICY "Users can update own onboarding progress"
    ON public.onboarding_progress
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.guidecrm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS guidecrm_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER guidecrm_onboarding_progress_updated_at
    BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.guidecrm_update_updated_at();

-- Function to check if onboarding is complete and set completed_at
CREATE OR REPLACE FUNCTION public.guidecrm_check_onboarding_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if all steps are done (template step requires both quote AND invoice templates)
    IF NEW.company_done = TRUE
       AND NEW.template_quote_done = TRUE
       AND NEW.template_invoice_done = TRUE
       AND NEW.client_done = TRUE
       AND NEW.quote_done = TRUE
       AND NEW.invoice_done = TRUE
       AND NEW.member_done = TRUE
       AND NEW.inventory_done = TRUE
       AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set completed_at when all steps are done
DROP TRIGGER IF EXISTS guidecrm_check_complete ON public.onboarding_progress;
CREATE TRIGGER guidecrm_check_complete
    BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.guidecrm_check_onboarding_complete();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.onboarding_progress TO authenticated;

COMMENT ON TABLE public.onboarding_progress IS 'GUIDECRM: Tracks user onboarding progress through the 7 setup steps';
COMMENT ON COLUMN public.onboarding_progress.company_done IS 'Step 1: User has filled in company settings';
COMMENT ON COLUMN public.onboarding_progress.template_quote_done IS 'Step 2a: User has created a quote template';
COMMENT ON COLUMN public.onboarding_progress.template_invoice_done IS 'Step 2b: User has created an invoice template';
COMMENT ON COLUMN public.onboarding_progress.client_done IS 'Step 3: User has created a client';
COMMENT ON COLUMN public.onboarding_progress.quote_done IS 'Step 4: User has created a quote';
COMMENT ON COLUMN public.onboarding_progress.invoice_done IS 'Step 5: User has created an invoice';
COMMENT ON COLUMN public.onboarding_progress.member_done IS 'Step 6: User has invited a team member';
COMMENT ON COLUMN public.onboarding_progress.inventory_done IS 'Step 7: User has added an inventory item';
COMMENT ON COLUMN public.onboarding_progress.completed_at IS 'Timestamp when all steps were completed (never show onboarding again)';
