-- Meldingen in de Android- en iPhone-app (via Firebase Cloud Messaging)
-- en een afgeschermde plek voor sleutels die niet in de (openbare) code mogen staan.

-- 1. Push-abonnementen: naast browsers (web) nu ook app-toestellen (fcm)
ALTER TABLE public.push_abonnementen ADD COLUMN IF NOT EXISTS soort TEXT NOT NULL DEFAULT 'web';
ALTER TABLE public.push_abonnementen DROP CONSTRAINT IF EXISTS push_abonnementen_soort_check;
ALTER TABLE public.push_abonnementen ADD CONSTRAINT push_abonnementen_soort_check CHECK (soort IN ('web', 'fcm'));
ALTER TABLE public.push_abonnementen ALTER COLUMN p256dh DROP NOT NULL;
ALTER TABLE public.push_abonnementen ALTER COLUMN auth DROP NOT NULL;

-- 2. Geheimen: alleen de server (service role) kan hierbij. Geen policies = niemand anders.
CREATE TABLE IF NOT EXISTS public.geheimen (
  naam TEXT PRIMARY KEY,
  waarde TEXT NOT NULL,
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.geheimen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geheimen FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.geheimen FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.geheimen TO service_role;
