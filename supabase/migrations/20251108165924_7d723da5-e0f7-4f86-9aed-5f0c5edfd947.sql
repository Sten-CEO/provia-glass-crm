-- Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('consommable', 'materiel')),
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT,
  supplier TEXT,
  supplier_name TEXT,
  unit_price_ht NUMERIC DEFAULT 0,
  unit_cost_ht NUMERIC DEFAULT 0,
  tva_rate NUMERIC DEFAULT 20,
  qty_on_hand NUMERIC NOT NULL DEFAULT 0,
  qty_reserved NUMERIC NOT NULL DEFAULT 0,
  min_qty_alert NUMERIC DEFAULT 0,
  location TEXT,
  notes TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'reserve', 'unreserve', 'expected_in', 'expected_out')),
  source TEXT NOT NULL CHECK (source IN ('achat', 'intervention', 'devis', 'manuel')),
  ref_id TEXT,
  ref_number TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  qty NUMERIC NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('planned', 'done', 'canceled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('consommable', 'materiel')),
  number TEXT NOT NULL,
  supplier TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'partielle', 'reçue', 'annulée')),
  expected_date DATE,
  received_date DATE,
  note TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for now)
CREATE POLICY "Allow public read access on inventory_items" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on inventory_items" ON public.inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on inventory_items" ON public.inventory_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on inventory_items" ON public.inventory_items FOR DELETE USING (true);

CREATE POLICY "Allow public read access on inventory_movements" ON public.inventory_movements FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on inventory_movements" ON public.inventory_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on inventory_movements" ON public.inventory_movements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on inventory_movements" ON public.inventory_movements FOR DELETE USING (true);

CREATE POLICY "Allow public read access on purchase_orders" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on purchase_orders" ON public.purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on purchase_orders" ON public.purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on purchase_orders" ON public.purchase_orders FOR DELETE USING (true);

-- Create indexes for performance
CREATE INDEX idx_inventory_items_type ON public.inventory_items(type);
CREATE INDEX idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_status ON public.inventory_movements(status);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_inventory_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_updated_at();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_updated_at();

-- Add custom_fields column to clients table for custom fields
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;