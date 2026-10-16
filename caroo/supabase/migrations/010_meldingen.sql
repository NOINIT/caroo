-- Meldingen: per gebruiker kiezen voor pop-up en/of e-mail
ALTER TABLE users ADD COLUMN IF NOT EXISTS melding_push  BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS melding_email BOOLEAN NOT NULL DEFAULT TRUE;

-- Telefoons/browsers die pop-ups mogen ontvangen
CREATE TABLE IF NOT EXISTS push_abonnementen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_abonnementen(user_id);

-- Alleen de server (service role) leest en schrijft hierin
ALTER TABLE push_abonnementen ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
