-- Check the data type of notifications.link column
SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
  AND column_name = 'link';
