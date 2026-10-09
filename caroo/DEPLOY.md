# Caroo — Deployment Handleiding

## Vereisten
- GitHub account (onder NOINIT organisatie)
- Supabase account (project al aangemaakt in Frankfurt)
- Stripe account (live modus)
- Vercel account (gratis tier is genoeg)
- Domein caroo.nl (bij Transip of Cloudflare)

---

## Stap 1 — GitHub repo aanmaken

```bash
# In de caroo map
git init
git add .
git commit -m "Initial commit: Caroo MVP"
gh repo create noinit/caroo --private --source=. --push
```

---

## Stap 2 — Supabase migrations uitvoeren

Ga naar je Supabase project → SQL Editor en voer deze bestanden uit in volgorde:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_seed_categorieen.sql`
4. `supabase/migrations/004_increment_function.sql`
5. `supabase/migrations/005_storage.sql`

---

## Stap 3 — Supabase configuratie

**Auth instellingen** (Authentication → Settings):
- Site URL: `https://caroo.nl`
- Redirect URLs toevoegen:
  - `https://caroo.nl/auth/callback`
  - `https://caroo.nl/auth/magic-link`

**Auth e-mail templates** (optioneel maar aangeraden):
- Magic Link e-mail aanpassen met Caroo logo en Nederlandse tekst

---

## Stap 4 — Stripe configuratie

1. Ga naar stripe.com → Maak product aan:
   - Naam: "Caroo Zorggroep"
   - Prijs: €4,99 eenmalig
   - Betaalmethoden activeren: iDEAL + Creditcard

2. Webhook aanmaken:
   - URL: `https://caroo.nl/api/stripe/webhook`
   - Events: `checkout.session.completed`
   - Kopieer het Webhook Secret (whsec_...)

---

## Stap 5 — Vercel deployment

1. Ga naar vercel.com → New Project → Import van GitHub (noinit/caroo)

2. Framework: **Next.js** (automatisch herkend)

3. Environment Variables invullen:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_SITE_URL=https://caroo.nl
   ```

4. Deploy → wacht tot het klaar is

---

## Stap 6 — Domein koppelen

1. In Vercel → Project Settings → Domains → Add `caroo.nl`
2. Vercel geeft DNS records (A of CNAME)
3. Voer deze in bij je domeinhoster (Transip/Cloudflare)
4. Wacht max. 10 minuten op propagatie

---

## Stap 7 — Webhook URL bijwerken in Stripe

Na deployment: ga naar Stripe → Webhooks → pas de URL bij naar `https://caroo.nl/api/stripe/webhook`

---

## Klaar 🎉

Je Caroo app is live op caroo.nl. Test het volledige proces:
1. Account aanmaken
2. Zorggroep aanmaken
3. Betalen (gebruik Stripe testmodus voor de eerste test)
4. Iemand uitnodigen
5. Agenda/medicijnen/taken testen
