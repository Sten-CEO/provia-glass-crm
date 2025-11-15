-- Créer la table profiles pour stocker prénom et nom des utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name text,
  last_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent lire leur propre profil
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
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

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- S'assurer que company_settings a les bonnes politiques RLS
DROP POLICY IF EXISTS "Allow public read access on company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Allow public update access on company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Allow public insert access on company_settings" ON public.company_settings;

CREATE POLICY "Anyone can read company settings"
  ON public.company_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update company settings"
  ON public.company_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert company settings"
  ON public.company_settings
  FOR INSERT
  WITH CHECK (true);