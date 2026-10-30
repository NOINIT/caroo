import 'server-only'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'
import { maakT, type TFunctie } from '@/lib/i18n/vertaal'
import { isTaal, STANDAARD_TAAL, taalInfo, type Taal } from '@/lib/i18n/talen'
import { isGeenEmail } from '@/lib/koppelen'

export interface Melding {
  titel: string
  tekst: string
  /** Pad in de app, bijv. /groep/123 */
  url: string
  tag?: string
}

/** Een melding mag ook een functie zijn: dan krijgt iedere ontvanger hem in zijn eigen taal. */
export type MeldingInvoer = Melding | ((t: TFunctie) => Melding)

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'

let vapidKlaar = false
function pushBeschikbaar() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  if (!vapidKlaar) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:caroo@noinit.nl', pub, priv)
    vapidKlaar = true
  }
  return true
}

function escape(t: string) {
  return t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

async function stuurMail(naar: string, m: Melding, taal: Taal) {
  const t = maakT(taal)
  const dir = taalInfo(taal).dir
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const link = `${BASIS_URL}${m.url}`
  const html = `
    <div dir="${dir}" lang="${taal}" style="font-family:Arial,sans-serif;max-width:480px">
      <h2 style="color:#1A2F5A">${escape(m.titel)}</h2>
      <p style="font-size:17px;color:#333">${escape(m.tekst)}</p>
      <p><a href="${link}" style="display:inline-block;padding:14px 28px;background:#1A7A6E;color:#fff;border-radius:10px;text-decoration:none;font-size:17px;font-weight:bold">${escape(t('mail.openClanoo'))}</a></p>
      <p style="font-size:13px;color:#888">${escape(t('mail.waaromMelding'))}</p>
    </div>`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MELDING_AFZENDER || 'Clanoo <clanoo@noinit.nl>',
      to: [naar],
      subject: m.titel,
      html,
    }),
  }).catch(() => {})
}

/**
 * Stuur een melding naar een of meer gebruikers, volgens ieders eigen keuze:
 * pop-up op de telefoon, e-mail, allebei of niets.
 * Fouten bij het versturen mogen de actie zelf nooit laten mislukken.
 */
export async function stuurMelding(userIds: string[], invoer: MeldingInvoer) {
  const ids = Array.from(new Set(userIds)).filter(Boolean)
  if (ids.length === 0) return

  try {
    const service = createServiceClient()
    const { data: ontvangers } = await service
      .from('users')
      .select('id, email, melding_push, melding_email, taal')
      .in('id', ids)

    const taalVan = new Map<string, Taal>()
    for (const o of ontvangers || []) taalVan.set(o.id, isTaal(o.taal) ? o.taal : STANDAARD_TAAL)
    const meldingIn = (taal: Taal): Melding => (typeof invoer === 'function' ? invoer(maakT(taal)) : invoer)

    const pushIds = (ontvangers || []).filter(o => o.melding_push).map(o => o.id)
    const taken: Promise<unknown>[] = (ontvangers || [])
      .filter(o => o.melding_email && o.email && !isGeenEmail(o.email))
      .map(o => {
        const taal = taalVan.get(o.id) ?? STANDAARD_TAAL
        return stuurMail(o.email as string, meldingIn(taal), taal)
      })

    if (pushIds.length > 0 && pushBeschikbaar()) {
      const { data: abonnementen } = await service
        .from('push_abonnementen')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', pushIds)

      for (const a of abonnementen || []) {
        const payload = JSON.stringify(meldingIn(taalVan.get(a.user_id) ?? STANDAARD_TAAL))
        taken.push(
          webpush
            .sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload, { TTL: 60 * 60 * 12 })
            .catch(async (err: any) => {
              // Telefoon heeft meldingen ingetrokken of de app verwijderd: opruimen
              if (err?.statusCode === 404 || err?.statusCode === 410) {
                await service.from('push_abonnementen').delete().eq('id', a.id)
              }
            })
        )
      }
    }

    await Promise.allSettled(taken)
  } catch {
    // Meldingen zijn een extraatje; nooit de hoofdactie breken
  }
}

/** Alle groepsleden behalve de opgegeven gebruiker */
export async function groepsledenBehalve(groepId: string, behalveUserId: string) {
  const { data } = await createServiceClient()
    .from('groepsleden')
    .select('user_id')
    .eq('groep_id', groepId)
    .neq('user_id', behalveUserId)
  return (data || []).map(r => r.user_id as string)
}
