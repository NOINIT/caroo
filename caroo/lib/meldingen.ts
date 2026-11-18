import 'server-only'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'
import { maakT, type TFunctie } from '@/lib/i18n/vertaal'
import { isTaal, STANDAARD_TAAL, taalInfo, type Taal } from '@/lib/i18n/talen'
import { isGeenEmail } from '@/lib/koppelen'
import { stuurFcm } from '@/lib/fcm'
import { stuurMail, escapeHtml } from '@/lib/mail'

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
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:clanoo@noinit.nl', pub, priv)
    vapidKlaar = true
  }
  return true
}

/**
 * Wat er buiten Clanoo zichtbaar is (op het vergrendelscherm, en bij Google, Apple en de maildienst),
 * bevat nooit namen of inhoud. Alleen het soort nieuws. Wat er precies is, zie je in de app zelf.
 */
function neutraal(m: Melding, t: TFunctie): Melding {
  const tag = m.tag || ''
  const soort = tag.startsWith('bezoek') ? 'bezoek'
    : tag.startsWith('samen') ? 'samen'
    : tag.startsWith('spel') || tag.startsWith('potje') ? 'spel'
    : tag.startsWith('vriend') || tag.startsWith('verzoek') || m.url.includes('/vrienden') ? 'vriend'
    : 'algemeen'
  return { titel: 'Clanoo', tekst: t(`meldingNeutraal.${soort}`), url: m.url, tag: m.tag }
}

async function stuurMeldingMail(naar: string, m: Melding, taal: Taal) {
  const t = maakT(taal)
  const dir = taalInfo(taal).dir
  const link = `${BASIS_URL}${m.url}`
  const html = `
    <div dir="${dir}" lang="${taal}" style="font-family:Arial,sans-serif;max-width:480px">
      <p style="font-size:18px;color:#1A2F5A">${escapeHtml(m.tekst)}</p>
      <p><a href="${link}" style="display:inline-block;padding:14px 28px;background:#1A7A6E;color:#fff;border-radius:10px;text-decoration:none;font-size:17px;font-weight:bold">${escapeHtml(t('mail.openClanoo'))}</a></p>
      <p style="font-size:13px;color:#888">${escapeHtml(t('mail.waaromMelding'))}</p>
    </div>`
  await stuurMail({ naar, onderwerp: m.tekst, html })
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
    const meldingIn = (taal: Taal): Melding => {
      const t = maakT(taal)
      return neutraal(typeof invoer === 'function' ? invoer(t) : invoer, t)
    }

    const pushIds = (ontvangers || []).filter(o => o.melding_push).map(o => o.id)
    const taken: Promise<unknown>[] = (ontvangers || [])
      .filter(o => o.melding_email && o.email && !isGeenEmail(o.email))
      .map(o => {
        const taal = taalVan.get(o.id) ?? STANDAARD_TAAL
        return stuurMeldingMail(o.email as string, meldingIn(taal), taal)
      })

    if (pushIds.length > 0) {
      const { data: abonnementen } = await service
        .from('push_abonnementen')
        .select('id, user_id, endpoint, p256dh, auth, soort')
        .in('user_id', pushIds)

      const webKlaar = pushBeschikbaar()
      for (const a of abonnementen || []) {
        const m = meldingIn(taalVan.get(a.user_id) ?? STANDAARD_TAAL)
        if (a.soort === 'fcm') {
          // Android- of iPhone-app
          taken.push(
            stuurFcm(a.endpoint, m).then(async uitkomst => {
              if (uitkomst === 'weg') await service.from('push_abonnementen').delete().eq('id', a.id)
            })
          )
          continue
        }
        if (!webKlaar || !a.p256dh || !a.auth) continue
        taken.push(
          webpush
            .sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(m), { TTL: 60 * 60 * 12 })
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
