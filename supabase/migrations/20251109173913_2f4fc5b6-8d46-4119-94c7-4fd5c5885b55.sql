-- Table des modèles de documents (devis, factures, emails)
CREATE TABLE IF NOT EXISTS doc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('QUOTE', 'INVOICE', 'EMAIL')),
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  content_html TEXT NOT NULL,
  header_html TEXT,
  footer_html TEXT,
  css TEXT,
  locale TEXT DEFAULT 'fr-FR',
  paper_format TEXT DEFAULT 'A4',
  paper_orientation TEXT DEFAULT 'portrait',
  margin_top INTEGER DEFAULT 20,
  margin_bottom INTEGER DEFAULT 20,
  margin_left INTEGER DEFAULT 20,
  margin_right INTEGER DEFAULT 20,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide par type et défaut
CREATE INDEX idx_doc_templates_type ON doc_templates(type);
CREATE INDEX idx_doc_templates_default ON doc_templates(is_default) WHERE is_default = true;

-- Table des services prédéfinis (catalogue)
CREATE TABLE IF NOT EXISTS service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'unité',
  default_price_ht NUMERIC DEFAULT 0,
  default_tva_rate NUMERIC DEFAULT 20,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_service_items_active ON service_items(is_active) WHERE is_active = true;
CREATE INDEX idx_service_items_category ON service_items(category);

-- Table des réservations d'inventaire
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES devis(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES factures(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  qty_reserved NUMERIC NOT NULL DEFAULT 0,
  qty_consumed NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'consumed', 'cancelled')),
  reserved_at TIMESTAMPTZ DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_reservations_item ON inventory_reservations(inventory_item_id);
CREATE INDEX idx_inventory_reservations_quote ON inventory_reservations(quote_id);
CREATE INDEX idx_inventory_reservations_status ON inventory_reservations(status);

-- Ajouter des colonnes manquantes aux devis
ALTER TABLE devis ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed'));
ALTER TABLE devis ADD COLUMN IF NOT EXISTS discount_global NUMERIC DEFAULT 0;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES doc_templates(id);
ALTER TABLE devis ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE devis ADD COLUMN IF NOT EXISTS quote_valid_days INTEGER DEFAULT 30;

-- Ajouter colonnes manquantes aux factures
ALTER TABLE factures ADD COLUMN IF NOT EXISTS source_quote_id UUID REFERENCES devis(id);
ALTER TABLE factures ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'FULL' CHECK (invoice_type IN ('FULL', 'DEPOSIT', 'BALANCE'));
ALTER TABLE factures ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES doc_templates(id);
ALTER TABLE factures ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Fonction pour mettre à jour qty_reserved dans inventory_items
CREATE OR REPLACE FUNCTION update_inventory_reserved()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE inventory_items
    SET qty_reserved = qty_reserved + NEW.qty_reserved
    WHERE id = NEW.inventory_item_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE inventory_items
    SET qty_reserved = qty_reserved - OLD.qty_reserved + NEW.qty_reserved
    WHERE id = NEW.inventory_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE inventory_items
    SET qty_reserved = qty_reserved - OLD.qty_reserved
    WHERE id = OLD.inventory_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour maintenir qty_reserved à jour
DROP TRIGGER IF EXISTS trg_update_inventory_reserved ON inventory_reservations;
CREATE TRIGGER trg_update_inventory_reserved
AFTER INSERT OR UPDATE OR DELETE ON inventory_reservations
FOR EACH ROW EXECUTE FUNCTION update_inventory_reserved();

-- RLS policies
ALTER TABLE doc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on doc_templates" ON doc_templates FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on doc_templates" ON doc_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on doc_templates" ON doc_templates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on doc_templates" ON doc_templates FOR DELETE USING (true);

CREATE POLICY "Allow public read access on service_items" ON service_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on service_items" ON service_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on service_items" ON service_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on service_items" ON service_items FOR DELETE USING (true);

CREATE POLICY "Allow public read access on inventory_reservations" ON inventory_reservations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on inventory_reservations" ON inventory_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on inventory_reservations" ON inventory_reservations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on inventory_reservations" ON inventory_reservations FOR DELETE USING (true);

-- Insérer un modèle de devis par défaut
INSERT INTO doc_templates (type, name, is_default, content_html, header_html, footer_html)
VALUES (
  'QUOTE',
  'Modèle standard de devis',
  true,
  '<div class="quote-body">
    <h1>DEVIS N° {{quote.number}}</h1>
    <div class="info-section">
      <div class="company-info">
        <strong>{{company.name}}</strong><br/>
        {{company.address}}<br/>
        {{company.zip}} {{company.city}}<br/>
        SIRET: {{company.siret}}<br/>
        Email: {{company.email}}<br/>
        Tél: {{company.phone}}
      </div>
      <div class="client-info">
        <strong>CLIENT</strong><br/>
        {{client.display_name}}<br/>
        {{client.billing_address.street}}<br/>
        {{client.billing_address.zip}} {{client.billing_address.city}}
      </div>
    </div>
    <div class="dates">
      <p>Date: {{date quote.issue_date}}</p>
      <p>Valable jusqu''au: {{date quote.expires_at}}</p>
    </div>
    <table class="lines-table">
      <thead>
        <tr>
          <th>Désignation</th>
          <th>Qté</th>
          <th>Unité</th>
          <th>PU HT</th>
          <th>TVA</th>
          <th>Total HT</th>
        </tr>
      </thead>
      <tbody>
        {{#each quote.lines}}
        <tr>
          <td><strong>{{this.name}}</strong><br/>{{this.description}}</td>
          <td>{{this.qty}}</td>
          <td>{{this.unit}}</td>
          <td>{{money this.unit_price_ht}}</td>
          <td>{{this.tva_rate}}%</td>
          <td>{{money this.total_ht}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    <div class="totals">
      <p>Total HT: {{money quote.subtotal_ht}}</p>
      <p>Total TVA: {{money quote.total_taxes}}</p>
      <p><strong>Total TTC: {{money quote.total_ttc}}</strong></p>
    </div>
    <div class="notes">
      <p>{{quote.notes}}</p>
    </div>
  </div>',
  '<div class="header"><img src="{{company.logo_url}}" alt="Logo" style="max-height: 60px;"/></div>',
  '<div class="footer"><p>{{company.name}} - SIRET: {{company.siret}} - TVA: {{company.tva_intra}}</p></div>'
) ON CONFLICT DO NOTHING;