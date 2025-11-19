-- Mettre à jour tous les users avec role='employee' vers 'employe_terrain'
-- car c'était une erreur de mapping
UPDATE user_roles 
SET role = 'employe_terrain'
WHERE role = 'employee';