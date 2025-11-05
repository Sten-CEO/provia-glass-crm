-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  ville TEXT,
  adresse TEXT,
  tva TEXT,
  tags TEXT[],
  statut TEXT DEFAULT 'Actif',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create devis table
CREATE TABLE public.devis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  client_nom TEXT NOT NULL,
  montant TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'Brouillon',
  lignes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create factures table
CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  client_nom TEXT NOT NULL,
  montant TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'En attente',
  echeance TEXT NOT NULL,
  lignes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipe table
CREATE TABLE public.equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Membre',
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom TEXT NOT NULL,
  employe_id UUID REFERENCES public.equipe(id) ON DELETE SET NULL,
  employe_nom TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'À faire',
  date TEXT NOT NULL,
  description TEXT,
  lieu TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create timesheets table
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employe_id UUID REFERENCES public.equipe(id) ON DELETE CASCADE,
  employe_nom TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_titre TEXT NOT NULL,
  debut TEXT NOT NULL,
  fin TEXT NOT NULL,
  total TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for demo - no auth required)
CREATE POLICY "Allow public read access on clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Allow public read access on devis" ON public.devis FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on devis" ON public.devis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on devis" ON public.devis FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on devis" ON public.devis FOR DELETE USING (true);

CREATE POLICY "Allow public read access on factures" ON public.factures FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on factures" ON public.factures FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on factures" ON public.factures FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on factures" ON public.factures FOR DELETE USING (true);

CREATE POLICY "Allow public read access on jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on jobs" ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on jobs" ON public.jobs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on jobs" ON public.jobs FOR DELETE USING (true);

CREATE POLICY "Allow public read access on equipe" ON public.equipe FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on equipe" ON public.equipe FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on equipe" ON public.equipe FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on equipe" ON public.equipe FOR DELETE USING (true);

CREATE POLICY "Allow public read access on timesheets" ON public.timesheets FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on timesheets" ON public.timesheets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on timesheets" ON public.timesheets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on timesheets" ON public.timesheets FOR DELETE USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.factures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipe;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheets;