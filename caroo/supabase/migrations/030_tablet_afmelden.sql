-- Tablet op afstand afmelden: alle sessies van een hoofdpersoon beëindigen.
-- De verversingstokens horen bij de sessie en verdwijnen mee, dus binnen een uur
-- (de looptijd van het toegangstoken) is het toestel uitgelogd.
-- Alleen de server mag dit aanroepen; die controleert eerst of de vrager beheerder
-- of mantelzorger is en of het om een hoofdpersoon in dezelfde groep gaat.
CREATE OR REPLACE FUNCTION public.meld_tablet_af(p_user UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  aantal INTEGER;
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user::text;
  DELETE FROM auth.sessions WHERE user_id = p_user;
  GET DIAGNOSTICS aantal = ROW_COUNT;
  RETURN aantal;
END;
$$;

REVOKE ALL ON FUNCTION public.meld_tablet_af(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meld_tablet_af(UUID) TO service_role;
