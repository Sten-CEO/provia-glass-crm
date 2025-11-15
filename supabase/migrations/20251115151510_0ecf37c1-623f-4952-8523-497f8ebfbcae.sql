-- Add planned_end_time column to devis table
ALTER TABLE devis ADD COLUMN IF NOT EXISTS planned_end_time time without time zone;