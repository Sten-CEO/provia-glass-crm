-- Ajouter les nouveaux champs de personnalisation aux templates
ALTER TABLE doc_templates
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'classique',
ADD COLUMN IF NOT EXISTS header_logo text,
ADD COLUMN IF NOT EXISTS main_color text DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Arial',
ADD COLUMN IF NOT EXISTS show_vat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_discounts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS signature_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_subject text,
ADD COLUMN IF NOT EXISTS email_body text;

-- Ajouter un index sur le type pour les filtres
CREATE INDEX IF NOT EXISTS idx_doc_templates_type ON doc_templates(type);

-- Ajouter un commentaire pour documenter les valeurs possibles
COMMENT ON COLUMN doc_templates.theme IS 'Values: classique, compact, détaillé';
COMMENT ON COLUMN doc_templates.type IS 'Values: QUOTE, INVOICE, EMAIL';