-- Add new fields to doc_templates for logo positioning, sizing, and display options
ALTER TABLE doc_templates
ADD COLUMN IF NOT EXISTS logo_position text DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
ADD COLUMN IF NOT EXISTS logo_size text DEFAULT 'medium' CHECK (logo_size IN ('small', 'medium', 'large')),
ADD COLUMN IF NOT EXISTS show_remaining_balance boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN doc_templates.logo_position IS 'Position of the logo in the document header';
COMMENT ON COLUMN doc_templates.logo_size IS 'Size of the logo: small, medium, or large';
COMMENT ON COLUMN doc_templates.show_remaining_balance IS 'Show remaining balance on invoices';