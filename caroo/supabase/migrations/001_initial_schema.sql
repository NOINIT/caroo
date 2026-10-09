-- Caroo MVP - Initieel database schema
-- Alle tijden in UTC, weergave in NL tijdzone via frontend

-- Enum voor rollen
CREATE TYPE rol AS ENUM ('mantelzorger', 'oudere', 'groepsbeheerder');

-- Gebruikers (profiel bovenop Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  naam TEXT NOT NULL,
  rol rol NOT NULL DEFAULT 'mantelzorger',
  avatar_url TEXT,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zorggroepen
CREATE TABLE zorggroepen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  eigenaar_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  betaald BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_session_id TEXT UNIQUE,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groepsleden (koppeltabel users ↔ zorggroepen)
CREATE TABLE groepsleden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rol rol NOT NULL,
  toegevoegd_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(groep_id, user_id)
);

-- Uitnodigingen (token-gebaseerd, verlopen na 7 dagen)
CREATE TABLE uitnodigingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  uitgenodigd_door UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  rol rol NOT NULL,
  token TEXT NOT NULL UNIQUE,
  gebruikt BOOLEAN NOT NULL DEFAULT FALSE,
  verloopt_op TIMESTAMPTZ NOT NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate limiting voor uitnodigingen (max 10 per dag per gebruiker)
CREATE TABLE uitnodiging_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  aantal INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, datum)
);

-- Taken
CREATE TABLE taken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  beschrijving TEXT,
  toegewezen_aan UUID REFERENCES users(id) ON DELETE SET NULL,
  voltooid BOOLEAN NOT NULL DEFAULT FALSE,
  deadline TIMESTAMPTZ,
  aangemaakt_door UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agenda categorieën
CREATE TABLE agenda_categorieen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  kleur TEXT NOT NULL CHECK (kleur ~ '^#[0-9A-Fa-f]{6}$'),
  systeem BOOLEAN NOT NULL DEFAULT FALSE,
  aangemaakt_door UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Afspraken (agenda)
CREATE TABLE afspraken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  beschrijving TEXT,
  start_tijd TIMESTAMPTZ NOT NULL,
  eind_tijd TIMESTAMPTZ,
  categorie_id UUID REFERENCES agenda_categorieen(id) ON DELETE SET NULL,
  aangemaakt_door UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medicijnen
CREATE TABLE medicijnen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  dosering TEXT NOT NULL,
  tijdstippen TEXT[] NOT NULL DEFAULT '{}',
  opmerkingen TEXT,
  actief BOOLEAN NOT NULL DEFAULT TRUE,
  aangemaakt_door UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medicijn registraties (innamegeschiedenis)
CREATE TABLE medicijn_registraties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicijn_id UUID NOT NULL REFERENCES medicijnen(id) ON DELETE CASCADE,
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  tijdstip TEXT NOT NULL,
  ingenomen BOOLEAN NOT NULL,
  geregistreerd_door UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  geregistreerd_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(medicijn_id, datum, tijdstip)
);

-- Dagboek / Mijn verhaal
CREATE TABLE dagboek (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  inhoud TEXT NOT NULL,
  gesproken BOOLEAN NOT NULL DEFAULT FALSE,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tips van opa/oma
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  tekst TEXT NOT NULL,
  buurt_delen BOOLEAN NOT NULL DEFAULT FALSE,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foto's
CREATE TABLE fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES zorggroepen(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  opslag_pad TEXT NOT NULL,
  onderschrift TEXT,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: bijgewerkt_op automatisch bijwerken voor users
CREATE OR REPLACE FUNCTION update_bijgewerkt_op()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bijgewerkt_op = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_bijgewerkt_op
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_bijgewerkt_op();

-- Indexen voor performance
CREATE INDEX idx_groepsleden_groep_id ON groepsleden(groep_id);
CREATE INDEX idx_groepsleden_user_id ON groepsleden(user_id);
CREATE INDEX idx_uitnodigingen_token ON uitnodigingen(token);
CREATE INDEX idx_uitnodigingen_groep_id ON uitnodigingen(groep_id);
CREATE INDEX idx_taken_groep_id ON taken(groep_id);
CREATE INDEX idx_afspraken_groep_id ON afspraken(groep_id);
CREATE INDEX idx_afspraken_start_tijd ON afspraken(start_tijd);
CREATE INDEX idx_medicijnen_groep_id ON medicijnen(groep_id);
CREATE INDEX idx_medicijn_registraties_medicijn_id ON medicijn_registraties(medicijn_id);
CREATE INDEX idx_medicijn_registraties_datum ON medicijn_registraties(datum);
CREATE INDEX idx_dagboek_groep_id ON dagboek(groep_id);
CREATE INDEX idx_fotos_groep_id ON fotos(groep_id);
