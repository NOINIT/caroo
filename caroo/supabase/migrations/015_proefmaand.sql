-- 015: gratis eerste maand
-- Een zorggroep mag de eerste 30 dagen na het aanmaken alles gebruiken, ook zonder abonnement.
-- groep_betaald() wordt gebruikt in de RLS-policy voor uitnodigingen; die telt de proefmaand nu mee.
-- (De naam blijft, zodat bestaande policies niet hoeven te veranderen.)
CREATE OR REPLACE FUNCTION groep_betaald(p_groep_id UUID)
RETURNS BOOLEAN AS $$
  SELECT betaald OR (gestopt_op IS NULL AND aangemaakt_op > NOW() - INTERVAL '30 days')
  FROM public.zorggroepen WHERE id = p_groep_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
