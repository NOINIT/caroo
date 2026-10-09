-- Helper functie voor het verhogen van de uitnodiging teller
CREATE OR REPLACE FUNCTION increment_uitnodiging_teller(p_user_id UUID, p_datum DATE)
RETURNS VOID AS $$
BEGIN
  UPDATE uitnodiging_log
  SET aantal = aantal + 1
  WHERE user_id = p_user_id AND datum = p_datum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
