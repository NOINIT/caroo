-- 024: op de wachtlijst kan je ook kiezen "Voor mezelf".
ALTER TABLE public.wachtlijst DROP CONSTRAINT IF EXISTS wachtlijst_voor_wie_check;
ALTER TABLE public.wachtlijst ADD CONSTRAINT wachtlijst_voor_wie_check
  CHECK (voor_wie IN ('moeder', 'vader', 'opa_oma', 'partner', 'mezelf', 'anders'));
