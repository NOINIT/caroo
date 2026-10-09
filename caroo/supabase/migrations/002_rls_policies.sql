-- Caroo MVP - Row Level Security policies
-- ALLE tabellen hebben RLS aan, geen uitzonderingen

-- Helper functie: zit een user in een groep?
CREATE OR REPLACE FUNCTION is_groepslid(p_groep_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM groepsleden
    WHERE groep_id = p_groep_id
      AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper functie: heeft een user een bepaalde rol in een groep?
CREATE OR REPLACE FUNCTION groepsrol(p_groep_id UUID, p_user_id UUID)
RETURNS rol AS $$
  SELECT rol FROM groepsleden
  WHERE groep_id = p_groep_id AND user_id = p_user_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper functie: is de groep betaald?
CREATE OR REPLACE FUNCTION groep_betaald(p_groep_id UUID)
RETURNS BOOLEAN AS $$
  SELECT betaald FROM zorggroepen WHERE id = p_groep_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================
-- USERS
-- =====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Eigen profiel lezen
CREATE POLICY "users_eigen_lezen" ON users
  FOR SELECT USING (auth.uid() = id);

-- Groepsleden kunnen elkaars profiel zien
CREATE POLICY "users_groepsleden_lezen" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groepsleden gl1
      JOIN groepsleden gl2 ON gl1.groep_id = gl2.groep_id
      WHERE gl1.user_id = auth.uid()
        AND gl2.user_id = users.id
    )
  );

-- Eigen profiel aanmaken (via trigger bij registratie)
CREATE POLICY "users_eigen_aanmaken" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Eigen profiel bijwerken
CREATE POLICY "users_eigen_bijwerken" ON users
  FOR UPDATE USING (auth.uid() = id);

-- =====================
-- ZORGGROEPEN
-- =====================
ALTER TABLE zorggroepen ENABLE ROW LEVEL SECURITY;

-- Groepsleden kunnen de groep zien
CREATE POLICY "zorggroepen_leden_lezen" ON zorggroepen
  FOR SELECT USING (is_groepslid(id, auth.uid()));

-- Iedereen mag een groep aanmaken
CREATE POLICY "zorggroepen_aanmaken" ON zorggroepen
  FOR INSERT WITH CHECK (auth.uid() = eigenaar_id);

-- Alleen eigenaar mag de groep bijwerken
CREATE POLICY "zorggroepen_eigenaar_bijwerken" ON zorggroepen
  FOR UPDATE USING (auth.uid() = eigenaar_id);

-- =====================
-- GROEPSLEDEN
-- =====================
ALTER TABLE groepsleden ENABLE ROW LEVEL SECURITY;

-- Groepsleden kunnen andere leden zien
CREATE POLICY "groepsleden_leden_lezen" ON groepsleden
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

-- Groepsbeheerder of eigenaar mag leden toevoegen
CREATE POLICY "groepsleden_beheerder_toevoegen" ON groepsleden
  FOR INSERT WITH CHECK (
    groepsrol(groep_id, auth.uid()) IN ('groepsbeheerder', 'mantelzorger')
    OR EXISTS (SELECT 1 FROM zorggroepen WHERE id = groep_id AND eigenaar_id = auth.uid())
  );

-- Eigenaar mag leden verwijderen
CREATE POLICY "groepsleden_eigenaar_verwijderen" ON groepsleden
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM zorggroepen WHERE id = groep_id AND eigenaar_id = auth.uid())
    OR user_id = auth.uid()  -- Zelf verlaten
  );

-- =====================
-- UITNODIGINGEN
-- =====================
ALTER TABLE uitnodigingen ENABLE ROW LEVEL SECURITY;

-- Mantelzorgers/beheerders mogen uitnodigingen zien in hun groep
CREATE POLICY "uitnodigingen_leden_lezen" ON uitnodigingen
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

-- Mantelzorgers/beheerders mogen uitnodigen
CREATE POLICY "uitnodigingen_aanmaken" ON uitnodigingen
  FOR INSERT WITH CHECK (
    is_groepslid(groep_id, auth.uid())
    AND groepsrol(groep_id, auth.uid()) IN ('mantelzorger', 'groepsbeheerder')
    AND groep_betaald(groep_id) = TRUE
  );

-- Token wordt publiek gelezen (voor uitnodigingspagina) via service role

-- =====================
-- UITNODIGING_LOG
-- =====================
ALTER TABLE uitnodiging_log ENABLE ROW LEVEL SECURITY;

-- Alleen eigen log zien
CREATE POLICY "uitnodiging_log_eigen" ON uitnodiging_log
  FOR ALL USING (user_id = auth.uid());

-- =====================
-- TAKEN
-- =====================
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taken_groepsleden_lezen" ON taken
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "taken_groepsleden_aanmaken" ON taken
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "taken_groepsleden_bijwerken" ON taken
  FOR UPDATE USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "taken_aanmaker_verwijderen" ON taken
  FOR DELETE USING (aangemaakt_door = auth.uid());

-- =====================
-- AGENDA CATEGORIEËN
-- =====================
ALTER TABLE agenda_categorieen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorieen_groepsleden_lezen" ON agenda_categorieen
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "categorieen_groepsleden_aanmaken" ON agenda_categorieen
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

-- Systeemcategorieën mogen alleen hernoemd worden, niet de kleur van systeemcategorieën verwijderen
CREATE POLICY "categorieen_groepsleden_bijwerken" ON agenda_categorieen
  FOR UPDATE USING (is_groepslid(groep_id, auth.uid()));

-- Alleen niet-systeemcategorieën verwijderen
CREATE POLICY "categorieen_gebruiker_verwijderen" ON agenda_categorieen
  FOR DELETE USING (
    is_groepslid(groep_id, auth.uid())
    AND systeem = FALSE
    AND aangemaakt_door = auth.uid()
  );

-- =====================
-- AFSPRAKEN
-- =====================
ALTER TABLE afspraken ENABLE ROW LEVEL SECURITY;

CREATE POLICY "afspraken_groepsleden_lezen" ON afspraken
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "afspraken_groepsleden_aanmaken" ON afspraken
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "afspraken_groepsleden_bijwerken" ON afspraken
  FOR UPDATE USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "afspraken_aanmaker_verwijderen" ON afspraken
  FOR DELETE USING (aangemaakt_door = auth.uid());

-- =====================
-- MEDICIJNEN
-- =====================
ALTER TABLE medicijnen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medicijnen_groepsleden_lezen" ON medicijnen
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "medicijnen_mantelzorger_aanmaken" ON medicijnen
  FOR INSERT WITH CHECK (
    is_groepslid(groep_id, auth.uid())
    AND groepsrol(groep_id, auth.uid()) IN ('mantelzorger', 'groepsbeheerder')
  );

CREATE POLICY "medicijnen_mantelzorger_bijwerken" ON medicijnen
  FOR UPDATE USING (
    is_groepslid(groep_id, auth.uid())
    AND groepsrol(groep_id, auth.uid()) IN ('mantelzorger', 'groepsbeheerder')
  );

-- =====================
-- MEDICIJN REGISTRATIES
-- =====================
ALTER TABLE medicijn_registraties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registraties_groepsleden_lezen" ON medicijn_registraties
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "registraties_groepsleden_aanmaken" ON medicijn_registraties
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "registraties_aanmaker_bijwerken" ON medicijn_registraties
  FOR UPDATE USING (
    is_groepslid(groep_id, auth.uid())
    AND geregistreerd_door = auth.uid()
  );

-- =====================
-- DAGBOEK
-- =====================
ALTER TABLE dagboek ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dagboek_groepsleden_lezen" ON dagboek
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "dagboek_groepsleden_aanmaken" ON dagboek
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "dagboek_auteur_bijwerken" ON dagboek
  FOR UPDATE USING (auteur_id = auth.uid());

CREATE POLICY "dagboek_auteur_verwijderen" ON dagboek
  FOR DELETE USING (auteur_id = auth.uid());

-- =====================
-- TIPS
-- =====================
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_groepsleden_lezen" ON tips
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "tips_groepsleden_aanmaken" ON tips
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "tips_auteur_bijwerken" ON tips
  FOR UPDATE USING (auteur_id = auth.uid());

-- =====================
-- FOTO'S
-- =====================
ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fotos_groepsleden_lezen" ON fotos
  FOR SELECT USING (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "fotos_groepsleden_uploaden" ON fotos
  FOR INSERT WITH CHECK (is_groepslid(groep_id, auth.uid()));

CREATE POLICY "fotos_uploader_verwijderen" ON fotos
  FOR DELETE USING (uploader_id = auth.uid());
