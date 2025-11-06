-- Add new fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS demande TEXT,
ADD COLUMN IF NOT EXISTS debut DATE,
ADD COLUMN IF NOT EXISTS fin DATE;

-- Add new fields to devis table
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS vendeur TEXT,
ADD COLUMN IF NOT EXISTS message_client TEXT,
ADD COLUMN IF NOT EXISTS conditions TEXT,
ADD COLUMN IF NOT EXISTS notes_internes TEXT,
ADD COLUMN IF NOT EXISTS remise DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acompte DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ht DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ttc DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_envoi TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signature_image TEXT,
ADD COLUMN IF NOT EXISTS signature_date TIMESTAMP WITH TIME ZONE;

-- Add new fields to factures table
ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS total_ht DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ttc DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remise DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS date_paiement TIMESTAMP WITH TIME ZONE;

-- Add new fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS adresse TEXT,
ADD COLUMN IF NOT EXISTS heure_debut TIME,
ADD COLUMN IF NOT EXISTS heure_fin TIME,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS zone TEXT,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes_timeline JSONB DEFAULT '[]'::jsonb;

-- Add new fields to equipe table
ALTER TABLE public.equipe
ADD COLUMN IF NOT EXISTS competences TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS access_controls JSONB DEFAULT '{}'::jsonb;

-- Create paiements table
CREATE TABLE IF NOT EXISTS public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  facture_id UUID REFERENCES public.factures(id) ON DELETE CASCADE,
  facture_numero TEXT NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  methode TEXT NOT NULL,
  date_paiement DATE NOT NULL,
  notes TEXT
);

-- Create attachments table for file uploads
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  entity_type TEXT NOT NULL, -- 'client', 'devis', 'facture', 'job'
  entity_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER
);

-- Create support_messages table for support chat
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_from_support BOOLEAN DEFAULT false,
  category TEXT
);

-- Enable RLS
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for paiements
CREATE POLICY "Allow public read access on paiements" ON public.paiements FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on paiements" ON public.paiements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on paiements" ON public.paiements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on paiements" ON public.paiements FOR DELETE USING (true);

-- Create policies for attachments
CREATE POLICY "Allow public read access on attachments" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on attachments" ON public.attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on attachments" ON public.attachments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on attachments" ON public.attachments FOR DELETE USING (true);

-- Create policies for support_messages
CREATE POLICY "Allow public read access on support_messages" ON public.support_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on support_messages" ON public.support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on support_messages" ON public.support_messages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on support_messages" ON public.support_messages FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.paiements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;