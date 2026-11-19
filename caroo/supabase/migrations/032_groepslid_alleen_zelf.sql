-- is_groepslid en groepsrol beantwoorden alleen nog de vraag over jezelf.
-- Alle RLS-regels roepen ze aan met auth.uid(); de server (service_role, zonder auth.uid()) mag alles vragen.
CREATE OR REPLACE FUNCTION public.is_groepslid(p_groep_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT p_user_id = COALESCE(auth.uid(), p_user_id) AND EXISTS (
    SELECT 1 FROM groepsleden
    WHERE groep_id = p_groep_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.groepsrol(p_groep_id UUID, p_user_id UUID)
RETURNS rol
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT rol FROM groepsleden
  WHERE groep_id = p_groep_id AND user_id = p_user_id
    AND p_user_id = COALESCE(auth.uid(), p_user_id)
  LIMIT 1;
$$;
