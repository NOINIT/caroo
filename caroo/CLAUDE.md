# Caroo

Familie-zorgapp van NOINIT. Next.js 14 (app router) + Supabase + Stripe, gehost op Vercel.

## Database
- Migraties staan in `supabase/migrations/` en worden met de hand in de Supabase SQL Editor uitgevoerd.
- **Elke nieuwe tabel krijgt in dezelfde migratie expliciete GRANTs** (sinds 30-10-2026 geeft Supabase die niet meer automatisch):
  `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabel> TO authenticated, service_role;`
  Geen rechten voor `anon`. Daarnaast altijd RLS aanzetten met policies via `is_groepslid()`.
- Rol 'oudere' heet in de app "Hoofdpersoon" (zie `lib/rollen.ts`).

## Werkwijze
- Code die een nieuwe tabel of kolom nodig heeft pas naar `main` pushen nadat de migratie in Supabase is gedraaid (anders breekt de live app).

## Talen
- De app is er in het Nederlands, Engels en Turks. Zie `lib/i18n/`.
- Arabisch (rechts-naar-links) is vertaald maar staat uit (`actief: false` in `lib/i18n/talen.ts`). Houd `ar.ts` wel bij, zodat het later terug kan.
- Zet geen tekst direct in een scherm. Voeg een sleutel toe aan `lib/i18n/woordenboeken/nl.ts` (de bron) en daarna aan `en.ts`, `tr.ts` en `ar.ts`. TypeScript klaagt als een taal een sleutel mist.
- In client-componenten: `const { t, datum, tijd } = useT()`. In servercode: `const { t } = await getT()`.
- Gebruik voor links/rechts de logische Tailwind-klassen (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `border-s`) en `rtl:rotate-180` voor pijlen.
- Meldingen en mails gaan in de taal van de ontvanger: geef `stuurMelding` een functie `t => ({ ... })`.
- Inhoud die gebruikers zelf typen (namen, boodschappen, dagboek) wordt niet vertaald.
