-- Add unique constraint on user_id to prevent duplicate rows in the future
-- This ensures each user_id can only appear once in the equipe table

-- Add unique constraint (will fail if duplicates still exist, so run cleanup first)
ALTER TABLE equipe
ADD CONSTRAINT equipe_user_id_unique
UNIQUE (user_id);

-- Log the constraint addition
DO $$
BEGIN
  RAISE NOTICE 'Unique constraint added to equipe.user_id successfully';
END $$;
