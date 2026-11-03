-- Simulatie beheren en rechten. Alles wordt aan het eind teruggedraaid (RAISE EXCEPTION).
DO $sim$
DECLARE
  e uuid := gen_random_uuid(); m uuid := gen_random_uuid(); o uuid := gen_random_uuid();
  x uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); d uuid := gen_random_uuid();
  g uuid; xg uuid; h uuid; r text := '';
BEGIN
  EXECUTE $f$
  CREATE FUNCTION pg_temp.doe(uid uuid, rol text, q text) RETURNS text LANGUAGE plpgsql AS $b$
  DECLARE n int;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', rol)::text, true);
    PERFORM set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
    EXECUTE 'SET LOCAL ROLE ' || rol;
    EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    RETURN n::text;
  EXCEPTION WHEN others THEN RETURN 'nee' || SQLSTATE;
  END $b$ $f$;
  EXECUTE $f$
  CREATE FUNCTION pg_temp.tel(uid uuid, rol text, q text) RETURNS text LANGUAGE plpgsql AS $b$
  DECLARE n bigint;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', rol)::text, true);
    PERFORM set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
    EXECUTE 'SET LOCAL ROLE ' || rol;
    EXECUTE q INTO n;
    RESET ROLE;
    RETURN n::text;
  EXCEPTION WHEN others THEN RETURN 'nee' || SQLSTATE;
  END $b$ $f$;

  -- Testpersonen (bestaan alleen binnen deze test)
  INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data)
  SELECT u, 'sim-' || u || '@voorbeeld.invalid', 'authenticated', 'authenticated', jsonb_build_object('naam', 'Sim')
  FROM unnest(ARRAY[e, m, o, x, o2, d]) u;
  INSERT INTO public.users (id, email, naam) SELECT u, 'sim-' || u || '@voorbeeld.invalid', 'Sim'
  FROM unnest(ARRAY[e, m, o, x, o2, d]) u ON CONFLICT (id) DO NOTHING;

  -- Groep G: familie beheert (E), mantelzorger M, hoofdpersoon O
  INSERT INTO zorggroepen (naam, eigenaar_id) VALUES ('Sim G', e) RETURNING id INTO g;
  INSERT INTO groepsleden (groep_id, user_id, rol, beheerder) VALUES (g, e, 'groepsbeheerder', true), (g, m, 'mantelzorger', false), (g, o, 'oudere', false);
  -- Groep XG van een buitenstaander X
  INSERT INTO zorggroepen (naam, eigenaar_id) VALUES ('Sim X', x) RETURNING id INTO xg;
  INSERT INTO groepsleden (groep_id, user_id, rol, beheerder) VALUES (xg, x, 'groepsbeheerder', true);
  -- Groep H: hoofdpersoon O2 beheert zelf, dochter D
  INSERT INTO zorggroepen (naam, eigenaar_id) VALUES ('Sim H', o2) RETURNING id INTO h;
  INSERT INTO groepsleden (groep_id, user_id, rol, beheerder) VALUES (h, o2, 'oudere', true), (h, d, 'mantelzorger', false);

  INSERT INTO dagboek (groep_id, auteur_id, inhoud) VALUES (g, o, 'sim');
  INSERT INTO uitnodigingen (groep_id, uitgenodigd_door, email, rol, token, verloopt_op)
  VALUES (g, e, 'a@voorbeeld.invalid', 'mantelzorger', 'sim-' || g, now() + interval '7 days'),
         (h, o2, 'b@voorbeeld.invalid', 'mantelzorger', 'sim-' || h, now() + interval '7 days');
  INSERT INTO uitnodiging_log (user_id, aantal) VALUES (m, 10);

  r := r || ' A1:' || pg_temp.tel(x, 'authenticated', format('select count(*) from zorggroepen where id=%L', g));
  r := r || ' A2:' || pg_temp.tel(x, 'authenticated', format('select count(*) from groepsleden where groep_id=%L', g));
  r := r || ' A3:' || pg_temp.tel(x, 'authenticated', format('select count(*) from dagboek where groep_id=%L', g));
  r := r || ' A4:' || pg_temp.tel(x, 'authenticated', format('select count(*) from users where id=%L', o));
  r := r || ' A5:' || pg_temp.doe(x, 'authenticated', format('insert into groepsleden (groep_id,user_id,rol) values (%L,%L,''mantelzorger'')', g, x));
  r := r || ' A6:' || pg_temp.doe(x, 'authenticated', format('insert into zorggroepen (naam,eigenaar_id) values (''z'',%L)', e));
  r := r || ' A7:' || pg_temp.tel(x, 'authenticated', 'select count(*) from vriendschappen');

  r := r || ' B1:' || pg_temp.doe(m, 'authenticated', format('insert into groepsleden (groep_id,user_id,rol) values (%L,%L,''mantelzorger'')', g, x));
  r := r || ' B2:' || pg_temp.doe(m, 'authenticated', format('update groepsleden set rol=''groepsbeheerder'', beheerder=true where groep_id=%L and user_id=%L', g, m));
  r := r || ' B3:' || pg_temp.doe(m, 'authenticated', format('update zorggroepen set betaald=true where id=%L', g));
  r := r || ' B4:' || pg_temp.tel(m, 'authenticated', format('select count(*) from uitnodigingen where groep_id=%L', g));
  r := r || ' B5:' || pg_temp.doe(m, 'authenticated', format('insert into uitnodigingen (groep_id,uitgenodigd_door,email,rol,token,verloopt_op) values (%L,%L,''c@voorbeeld.invalid'',''groepsbeheerder'',''sim2'',now()+interval ''7 days'')', g, m));
  r := r || ' B6:' || pg_temp.doe(m, 'authenticated', format('update uitnodiging_log set aantal=0 where user_id=%L', m));
  r := r || ' B7:' || pg_temp.doe(m, 'authenticated', format('delete from uitnodiging_log where user_id=%L', m));
  r := r || ' B8:' || pg_temp.doe(m, 'authenticated', format('delete from groepsleden where groep_id=%L and user_id=%L', g, o));
  r := r || ' B9:' || pg_temp.doe(m, 'authenticated', format('update users set naam=''x'' where id=%L', o));
  r := r || ' B10:' || pg_temp.tel(m, 'authenticated', format('select count(*) from dagboek where groep_id=%L', g));

  r := r || ' C1:' || pg_temp.doe(o, 'authenticated', format('update groepsleden set beheerder=true where groep_id=%L and user_id=%L', g, o));
  r := r || ' C2:' || pg_temp.doe(o, 'authenticated', format('insert into groepsleden (groep_id,user_id,rol) values (%L,%L,''mantelzorger'')', g, x));
  r := r || ' C3:' || pg_temp.tel(o, 'authenticated', format('select count(*) from uitnodigingen where groep_id=%L', g));

  r := r || ' D1:' || pg_temp.doe(e, 'authenticated', format('update zorggroepen set betaald=true where id=%L', g));
  r := r || ' D2:' || pg_temp.tel(e, 'authenticated', format('select count(*) from uitnodigingen where groep_id=%L', g));
  r := r || ' D3:' || pg_temp.doe(e, 'authenticated', format('insert into groepsleden (groep_id,user_id,rol) values (%L,%L,''mantelzorger'')', g, x));

  r := r || ' E1:' || pg_temp.tel(o2, 'authenticated', format('select count(*) from uitnodigingen where groep_id=%L', h));
  r := r || ' E2:' || pg_temp.doe(o2, 'authenticated', format('insert into groepsleden (groep_id,user_id,rol) values (%L,%L,''mantelzorger'')', h, m));
  r := r || ' E3:' || pg_temp.tel(d, 'authenticated', format('select count(*) from uitnodigingen where groep_id=%L', h));
  r := r || ' E4:' || pg_temp.doe(d, 'authenticated', format('update groepsleden set beheerder=true where groep_id=%L and user_id=%L', h, d));

  r := r || ' F1:' || pg_temp.tel(null, 'anon', 'select count(*) from zorggroepen');
  r := r || ' F2:' || pg_temp.tel(null, 'anon', 'select count(*) from users');
  r := r || ' F3:' || pg_temp.tel(null, 'anon', 'select count(*) from dagboek');

  r := r || ' G1:' || public.is_beheerder(g, e) || '/' || public.is_beheerder(g, m) || '/' || public.is_beheerder(g, o) || '/' || public.is_beheerder(h, o2) || '/' || public.is_beheerder(h, d);

  RAISE EXCEPTION 'UIT>>%<<UIT', r;
END $sim$;
