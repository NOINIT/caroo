-- Naam van de schrijver bewaren bij elk bericht, zodat die zichtbaar blijft
-- ook als het account later wordt verwijderd.
-- Vereist migratie 007 (auteur-kolommen nullable).

ALTER TABLE dagboek  ADD COLUMN IF NOT EXISTS auteur_naam TEXT;
ALTER TABLE tips     ADD COLUMN IF NOT EXISTS auteur_naam TEXT;
ALTER TABLE fotos    ADD COLUMN IF NOT EXISTS auteur_naam TEXT;

-- Vult auteur_naam automatisch bij het opslaan.
-- TG_ARGV[0] = naam van de kolom met het gebruikers-id.
CREATE OR REPLACE FUNCTION vul_auteur_naam()
RETURNS TRIGGER AS $$
DECLARE
  uid UUID;
BEGIN
  IF NEW.auteur_naam IS NULL THEN
    EXECUTE format('SELECT ($1).%I', TG_ARGV[0]) USING NEW INTO uid;
    SELECT naam INTO NEW.auteur_naam FROM public.users WHERE id = uid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS dagboek_auteur_naam ON dagboek;
CREATE TRIGGER dagboek_auteur_naam BEFORE INSERT ON dagboek
  FOR EACH ROW EXECUTE FUNCTION vul_auteur_naam('auteur_id');

DROP TRIGGER IF EXISTS tips_auteur_naam ON tips;
CREATE TRIGGER tips_auteur_naam BEFORE INSERT ON tips
  FOR EACH ROW EXECUTE FUNCTION vul_auteur_naam('auteur_id');

DROP TRIGGER IF EXISTS fotos_auteur_naam ON fotos;
CREATE TRIGGER fotos_auteur_naam BEFORE INSERT ON fotos
  FOR EACH ROW EXECUTE FUNCTION vul_auteur_naam('uploader_id');

-- Bestaande berichten aanvullen
UPDATE dagboek d SET auteur_naam = u.naam FROM users u WHERE u.id = d.auteur_id   AND d.auteur_naam IS NULL;
UPDATE tips    t SET auteur_naam = u.naam FROM users u WHERE u.id = t.auteur_id   AND t.auteur_naam IS NULL;
UPDATE fotos   f SET auteur_naam = u.naam FROM users u WHERE u.id = f.uploader_id AND f.auteur_naam IS NULL;

NOTIFY pgrst, 'reload schema';
