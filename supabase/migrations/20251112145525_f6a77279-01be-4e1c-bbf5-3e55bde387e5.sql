-- Créer les tables pour le support employé

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES equipe(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES equipe(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_events ENABLE ROW LEVEL SECURITY;

-- Employees can view/create their own tickets
CREATE POLICY "Employees can view own tickets" ON support_tickets
  FOR SELECT USING (employee_id IN (SELECT id FROM equipe WHERE user_id = auth.uid()));

CREATE POLICY "Employees can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (employee_id IN (SELECT id FROM equipe WHERE user_id = auth.uid()));

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Employees can create their own events
CREATE POLICY "Employees can create events" ON support_events
  FOR INSERT WITH CHECK (employee_id IN (SELECT id FROM equipe WHERE user_id = auth.uid()));

-- Admins can view all events
CREATE POLICY "Admins can view all events" ON support_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'));