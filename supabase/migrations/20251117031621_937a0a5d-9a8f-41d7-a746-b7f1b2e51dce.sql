-- Create function to update agenda event statuses based on dates
CREATE OR REPLACE FUNCTION update_agenda_event_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update events that have passed their end_at date to "terminé"
  UPDATE agenda_events
  SET status = 'terminé'
  WHERE end_at < NOW()
    AND status IN ('à venir', 'aujourd''hui');
END;
$$;