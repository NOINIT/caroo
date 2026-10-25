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
