-- Een ingetrokken bezoek- of belverzoek blijft bewaard (met tijdstip), zodat opnieuw vragen
-- binnen een dag niet nog eens de hele familie een melding stuurt.
ALTER TABLE public.bezoekverzoeken ADD COLUMN IF NOT EXISTS ingetrokken_op TIMESTAMPTZ;
