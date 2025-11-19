-- Add trigger to auto-populate company_id on company_settings
DROP TRIGGER IF EXISTS trg_set_company_settings_company_id ON public.company_settings;

CREATE TRIGGER trg_set_company_settings_company_id
  BEFORE INSERT ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_company_id();