-- Caroo MVP - Seed functie voor standaard agenda categorieën
-- Wordt aangeroepen bij aanmaken van een nieuwe zorggroep

CREATE OR REPLACE FUNCTION seed_standaard_categorieen(p_groep_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO agenda_categorieen (groep_id, naam, kleur, systeem, aangemaakt_door)
  VALUES
    (p_groep_id, 'Zorgafspraak',  '#1A7A6E', TRUE, NULL),
    (p_groep_id, 'Verjaardag',    '#E8711A', TRUE, NULL),
    (p_groep_id, 'Jubileum',      '#6B4FA0', TRUE, NULL),
    (p_groep_id, 'Feestje',       '#F4C542', TRUE, NULL),
    (p_groep_id, 'Herdenking',    '#888888', TRUE, NULL),
    (p_groep_id, 'Overig',        '#1A2F5A', TRUE, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: automatisch standaard categorieën aanmaken bij nieuwe zorggroep
CREATE OR REPLACE FUNCTION trigger_seed_categorieen()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_standaard_categorieen(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER zorggroep_aangemaakt_categorieen
  AFTER INSERT ON zorggroepen
  FOR EACH ROW EXECUTE FUNCTION trigger_seed_categorieen();
