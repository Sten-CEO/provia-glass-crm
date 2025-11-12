-- Ajouter la colonne app_access_status si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='equipe' AND column_name='app_access_status'
  ) THEN
    ALTER TABLE public.equipe 
    ADD COLUMN app_access_status TEXT DEFAULT 'none' CHECK (app_access_status IN ('none', 'active', 'suspended'));
    
    -- Mettre à jour les employés existants avec user_id
    UPDATE public.equipe 
    SET app_access_status = 'active' 
    WHERE user_id IS NOT NULL AND app_access_status = 'none';
  END IF;
END $$;