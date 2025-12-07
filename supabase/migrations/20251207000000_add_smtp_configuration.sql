-- Migration: Add SMTP configuration fields to companies table
-- Date: 2025-12-07
-- Description: Allow each company to configure their own SMTP server for sending emails

-- Add SMTP configuration columns to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS smtp_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS smtp_username TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS smtp_password TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.companies.smtp_enabled IS 'Enable/disable custom SMTP configuration';
COMMENT ON COLUMN public.companies.smtp_host IS 'SMTP server hostname (e.g., smtp.gmail.com)';
COMMENT ON COLUMN public.companies.smtp_port IS 'SMTP server port (e.g., 465 for SSL, 587 for STARTTLS)';
COMMENT ON COLUMN public.companies.smtp_username IS 'SMTP authentication username (usually the email address)';
COMMENT ON COLUMN public.companies.smtp_password IS 'SMTP authentication password (encrypted)';
COMMENT ON COLUMN public.companies.smtp_secure IS 'Use SSL/TLS (true) or STARTTLS (false)';
