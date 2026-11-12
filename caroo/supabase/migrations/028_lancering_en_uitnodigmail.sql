-- Mails rond de lancering en na het starten van een groep. Elke mail gaat maar één keer.
ALTER TABLE public.wachtlijst ADD COLUMN IF NOT EXISTS lancering_mail_op TIMESTAMPTZ;
ALTER TABLE public.wachtlijst ADD COLUMN IF NOT EXISTS lancering_herinnering_op TIMESTAMPTZ;
ALTER TABLE public.wachtlijst ADD COLUMN IF NOT EXISTS afgemeld_op TIMESTAMPTZ;
ALTER TABLE public.zorggroepen ADD COLUMN IF NOT EXISTS uitnodig_mail_op TIMESTAMPTZ;
