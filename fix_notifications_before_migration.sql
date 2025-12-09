-- FIX: Handle notifications without company_id before running main migrations
-- This script must be run BEFORE apply_all_migrations.sql

-- 1. Check how many notifications have NULL company_id
SELECT
  COUNT(*) as total_notifications,
  COUNT(company_id) as with_company_id,
  COUNT(*) - COUNT(company_id) as null_company_id
FROM public.notifications;

-- 2. Show problematic notifications (for debugging)
SELECT id, kind, type, title, link, created_at
FROM public.notifications
WHERE company_id IS NULL
LIMIT 20;

-- 3. Delete old notifications without company_id (safer than trying to guess)
-- This removes orphaned notifications that can't be linked to any company
DELETE FROM public.notifications
WHERE company_id IS NULL;

-- 4. Verify all notifications now have company_id
SELECT
  COUNT(*) as remaining_null
FROM public.notifications
WHERE company_id IS NULL;
