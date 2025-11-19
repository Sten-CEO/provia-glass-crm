-- Ajouter les nouveaux rôles à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'backoffice';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employe_terrain';

-- Note: 'admin' existe déjà
-- Mapping des rôles:
-- owner, admin, backoffice → accès CRM
-- employee, employe_terrain → accès app employé uniquement
-- manager → accès CRM (considéré comme backoffice)