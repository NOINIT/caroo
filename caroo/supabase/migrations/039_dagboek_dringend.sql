-- Dagboek: een aantekening van de familie kan dringend zijn (besluit Farzana 27-11-2026).
ALTER TABLE public.dagboek ADD COLUMN IF NOT EXISTS dringend BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS dagboek_dringend ON public.dagboek (groep_id, aangemaakt_op) WHERE dringend;
NOTIFY pgrst, 'reload schema';
