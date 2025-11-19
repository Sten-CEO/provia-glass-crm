
-- Supprimer les entrées user_roles en double pour cet utilisateur
-- Garder seulement l'entrée employee avec le bon company_id
DELETE FROM public.user_roles
WHERE user_id = '4d050d05-0c59-40d3-b3c3-9537d5e2cb5f'
  AND company_id = '7aba1084-fb0d-46b6-bde4-65ec252f87a8';
