-- Créer l'enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');

-- Créer la table user_roles pour la gestion sécurisée des rôles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction sécurisée pour vérifier les rôles (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Ajouter les colonnes nécessaires à la table equipe
ALTER TABLE public.equipe 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_equipe_user_id ON public.equipe(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Créer la table d'assignation des interventions
CREATE TABLE IF NOT EXISTS public.intervention_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.equipe(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (intervention_id, employee_id)
);

ALTER TABLE public.intervention_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_intervention_assignments_employee ON public.intervention_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_intervention_assignments_intervention ON public.intervention_assignments(intervention_id);

-- RLS Policies pour user_roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies pour equipe (employés peuvent voir leur propre profil)
CREATE POLICY "Employees can view their own profile"
  ON public.equipe
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can update their own profile"
  ON public.equipe
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies pour intervention_assignments
CREATE POLICY "Employees can view their own assignments"
  ON public.intervention_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.equipe 
      WHERE equipe.id = intervention_assignments.employee_id 
      AND equipe.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins can manage assignments"
  ON public.intervention_assignments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- RLS Policy pour jobs (employés voient uniquement leurs interventions)
CREATE POLICY "Employees can view assigned interventions"
  ON public.jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.intervention_assignments ia
      JOIN public.equipe e ON e.id = ia.employee_id
      WHERE ia.intervention_id = jobs.id
      AND e.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Employees can update their assigned interventions"
  ON public.jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.intervention_assignments ia
      JOIN public.equipe e ON e.id = ia.employee_id
      WHERE ia.intervention_id = jobs.id
      AND e.user_id = auth.uid()
    )
  );