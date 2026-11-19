-- De taal waarin iemand zich aanmeldde, zodat de lanceringsmail en het afmelden in die taal gaan.
ALTER TABLE public.wachtlijst ADD COLUMN IF NOT EXISTS taal TEXT NOT NULL DEFAULT 'nl';
DO $$ BEGIN
  ALTER TABLE public.wachtlijst ADD CONSTRAINT wachtlijst_taal_check CHECK (taal IN ('nl', 'en', 'tr'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
NOTIFY pgrst, 'reload schema';
