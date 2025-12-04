-- Migration: Enhance doc_templates table for advanced template system
-- Date: 2025-12-04
-- Description: Add new columns for Processly-like template management

-- Add new columns to doc_templates table
ALTER TABLE doc_templates
ADD COLUMN IF NOT EXISTS accent_color TEXT,
ADD COLUMN IF NOT EXISTS background_style TEXT DEFAULT 'solid' CHECK (background_style IN ('solid', 'gradient', 'pattern', 'none')),
ADD COLUMN IF NOT EXISTS header_layout TEXT DEFAULT 'logo-left' CHECK (header_layout IN ('logo-left', 'logo-center', 'logo-right', 'split')),
ADD COLUMN IF NOT EXISTS table_columns JSONB DEFAULT '{
  "description": true,
  "reference": true,
  "quantity": true,
  "days": false,
  "unit": true,
  "unit_price_ht": true,
  "vat_rate": true,
  "discount": false,
  "total_ht": true,
  "total_ttc": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS default_vat_rate NUMERIC(5,2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS default_payment_method TEXT,
ADD COLUMN IF NOT EXISTS email_type TEXT CHECK (email_type IN ('quote', 'invoice', 'reminder', NULL));

-- Add comments for documentation
COMMENT ON COLUMN doc_templates.accent_color IS 'Secondary color for accents and highlights';
COMMENT ON COLUMN doc_templates.background_style IS 'Background style: solid, gradient, pattern, or none';
COMMENT ON COLUMN doc_templates.header_layout IS 'Header layout: logo-left, logo-center, logo-right, or split';
COMMENT ON COLUMN doc_templates.table_columns IS 'JSON object defining which columns to display in document tables';
COMMENT ON COLUMN doc_templates.default_vat_rate IS 'Default VAT rate percentage for this template';
COMMENT ON COLUMN doc_templates.default_payment_method IS 'Default payment method (e.g., "Virement bancaire", "Chèque", "Espèces")';
COMMENT ON COLUMN doc_templates.email_type IS 'Type of email template: quote, invoice, or reminder (only for EMAIL type templates)';

-- Update existing templates with default values for new columns
UPDATE doc_templates
SET
  accent_color = COALESCE(accent_color, '#fbbf24'),
  background_style = COALESCE(background_style, 'solid'),
  header_layout = COALESCE(header_layout, 'logo-left'),
  default_vat_rate = COALESCE(default_vat_rate, 20.00),
  default_payment_method = COALESCE(default_payment_method, 'Virement bancaire')
WHERE accent_color IS NULL
   OR background_style IS NULL
   OR header_layout IS NULL
   OR default_vat_rate IS NULL
   OR default_payment_method IS NULL;

-- Set email_type for existing EMAIL templates
UPDATE doc_templates
SET email_type = 'quote'
WHERE type = 'EMAIL' AND email_type IS NULL;
