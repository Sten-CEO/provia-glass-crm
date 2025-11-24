-- Clean up duplicate rows in equipe table
-- Keep only the most recent row for each user_id

-- First, identify and delete older duplicate rows
DELETE FROM equipe a
USING equipe b
WHERE a.user_id = b.user_id
  AND a.user_id IS NOT NULL
  AND a.created_at < b.created_at;

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Duplicate equipe rows cleaned up successfully';
END $$;
