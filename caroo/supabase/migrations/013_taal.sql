-- 013: taal per gebruiker (Nederlands, Engels, Turks of Arabisch)
-- Bestaande gebruikers houden Nederlands.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS taal TEXT NOT NULL DEFAULT 'nl'
  CHECK (taal IN ('nl', 'en', 'tr', 'ar'));

-- Schema opnieuw laden zodat de app de nieuwe kolom direct ziet
NOTIFY pgrst, 'reload schema';
