-- Wachtlijst voor de lancering (oprichtersfamilies)
CREATE TABLE IF NOT EXISTS wachtlijst (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL CHECK (char_length(trim(naam)) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 5 AND 200),
  voor_wie TEXT CHECK (voor_wie IN ('moeder', 'vader', 'opa_oma', 'partner', 'anders')),
  bron TEXT CHECK (char_length(bron) <= 80),
  wil_updates BOOLEAN NOT NULL DEFAULT FALSE,
  aangemeld_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS wachtlijst_email_uniek ON wachtlijst (lower(email));

-- Alleen de server schrijft en leest; bezoekers en ingelogde gebruikers niet
ALTER TABLE wachtlijst ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wachtlijst TO service_role;
REVOKE ALL ON public.wachtlijst FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
