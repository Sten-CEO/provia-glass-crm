-- Add qty_reserved column to inventory_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'qty_reserved'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN qty_reserved numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_source ON inventory_movements(source);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref_id ON inventory_movements(ref_id);

-- Add comment for documentation
COMMENT ON COLUMN inventory_items.qty_reserved IS 'Quantity reserved for pending quotes/interventions';
COMMENT ON COLUMN inventory_items.qty_on_hand IS 'Physical quantity in stock';
