-- Fix duplicate notifications for timesheets
-- Remove the duplicate trigger "on_timesheet_created"
-- Keep only "trigger_notify_timesheet_created"

DROP TRIGGER IF EXISTS on_timesheet_created ON timesheets_entries;

-- Also ensure we only have one trigger for interventions
DROP TRIGGER IF EXISTS on_intervention_completed ON jobs;

COMMENT ON TRIGGER trigger_notify_timesheet_created ON timesheets_entries IS
'Trigger unique pour les notifications de pointage - version consolidée';
