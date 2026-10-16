-- Dagelijkse stemming van de hoofdpersoon en "Ik wil bezoek"-verzoeken

CREATE TABLE IF NOT EXISTS stemmingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  naam TEXT,
  datum DATE NOT NULL,
  stemming SMALLINT NOT NULL CHECK (stemming BETWEEN 1 AND 5),
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (groep_id, user_id, datum)
);
CREATE INDEX IF NOT EXISTS idx_stemmingen_groep_datum ON stemmingen(groep_id, datum);

CREATE TABLE IF NOT EXISTS bezoekverzoeken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  aangevraagd_door UUID REFERENCES users(id) ON DELETE SET NULL,
  aangevraagd_naam TEXT,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reactie_door UUID REFERENCES users(id) ON DELETE SET NULL,
  reactie_naam TEXT,
  reactie_op TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bezoek_groep ON bezoekverzoeken(groep_id, aangemaakt_op DESC);

ALTER TABLE stemmingen      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bezoekverzoeken ENABLE ROW LEVEL SECURITY;

-- Stemming: groep mag meelezen, alleen jezelf invullen
DROP POLICY IF EXISTS "stemming_lezen" ON stemmingen;
CREATE POLICY "stemming_lezen" ON stemmingen
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));
DROP POLICY IF EXISTS "stemming_eigen_invullen" ON stemmingen;
CREATE POLICY "stemming_eigen_invullen" ON stemmingen
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_groepslid(groep_id, auth.uid()));
DROP POLICY IF EXISTS "stemming_eigen_wijzigen" ON stemmingen;
CREATE POLICY "stemming_eigen_wijzigen" ON stemmingen
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Bezoek: groep mag lezen; zelf aanvragen; groepsleden mogen reageren
DROP POLICY IF EXISTS "bezoek_lezen" ON bezoekverzoeken;
CREATE POLICY "bezoek_lezen" ON bezoekverzoeken
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));
DROP POLICY IF EXISTS "bezoek_aanvragen" ON bezoekverzoeken;
CREATE POLICY "bezoek_aanvragen" ON bezoekverzoeken
  FOR INSERT WITH CHECK (aangevraagd_door = auth.uid() AND is_groepslid(groep_id, auth.uid()));
DROP POLICY IF EXISTS "bezoek_reageren" ON bezoekverzoeken;
CREATE POLICY "bezoek_reageren" ON bezoekverzoeken
  FOR UPDATE USING (is_groepslid(groep_id, auth.uid()));
DROP POLICY IF EXISTS "bezoek_intrekken" ON bezoekverzoeken;
CREATE POLICY "bezoek_intrekken" ON bezoekverzoeken
  FOR DELETE USING (aangevraagd_door = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stemmingen      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bezoekverzoeken TO authenticated;
NOTIFY pgrst, 'reload schema';

-- Persoonlijke instellingen
ALTER TABLE users ADD COLUMN IF NOT EXISTS lettergrootte TEXT NOT NULL DEFAULT 'normaal'
  CHECK (lettergrootte IN ('klein', 'normaal', 'groot', 'extra'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS geluid BOOLEAN NOT NULL DEFAULT TRUE;
NOTIFY pgrst, 'reload schema';
