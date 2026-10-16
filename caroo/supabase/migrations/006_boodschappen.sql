-- Boodschappenlijst per zorggroep
-- Een item staat op de lijst (op_lijst = true) of in "Eerder gekocht" (op_lijst = false).
-- Aanvinken zet op_lijst op false; opnieuw aantikken zet het weer op de lijst.

CREATE TABLE IF NOT EXISTS boodschappen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  naam TEXT NOT NULL CHECK (char_length(trim(naam)) BETWEEN 1 AND 80),
  op_lijst BOOLEAN NOT NULL DEFAULT TRUE,
  toegevoegd_door UUID REFERENCES users(id) ON DELETE SET NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Elk product maar één keer per groep (hoofdletters maken niet uit)
CREATE UNIQUE INDEX IF NOT EXISTS boodschappen_groep_naam_uniek
  ON boodschappen (groep_id, lower(trim(naam)));

CREATE INDEX IF NOT EXISTS idx_boodschappen_groep_id ON boodschappen(groep_id);

ALTER TABLE boodschappen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boodschappen_lezen" ON boodschappen;
CREATE POLICY "boodschappen_lezen" ON boodschappen
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

DROP POLICY IF EXISTS "boodschappen_toevoegen" ON boodschappen;
CREATE POLICY "boodschappen_toevoegen" ON boodschappen
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

DROP POLICY IF EXISTS "boodschappen_bijwerken" ON boodschappen;
CREATE POLICY "boodschappen_bijwerken" ON boodschappen
  FOR UPDATE USING (is_groepslid(groep_id, auth.uid()));

DROP POLICY IF EXISTS "boodschappen_verwijderen" ON boodschappen;
CREATE POLICY "boodschappen_verwijderen" ON boodschappen
  FOR DELETE USING (is_groepslid(groep_id, auth.uid()));

-- Nieuwe tabellen zijn niet altijd automatisch beschikbaar voor de app
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boodschappen TO authenticated;
NOTIFY pgrst, 'reload schema';
