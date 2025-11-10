-- Add missing fields to inventory_movements for scheduled movements
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS effective_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES equipe(id);

-- Add low_stock_threshold to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC DEFAULT 0;

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  value_ht NUMERIC DEFAULT 0,
  value_ttc NUMERIC DEFAULT 0,
  billing_frequency TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on contracts"
ON contracts FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on contracts"
ON contracts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on contracts"
ON contracts FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on contracts"
ON contracts FOR DELETE USING (true);

-- Add contract_id to jobs
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id);

-- Add inventory_item_id to devis lignes (stored in jsonb)
-- This will be handled in the application layer by storing inventory_item_id in the lignes jsonb

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_scheduled ON inventory_movements(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_source ON inventory_movements(source, ref_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);

-- Update trigger for contracts
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_contracts_updated_at_trigger
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_contracts_updated_at();