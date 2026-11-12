import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'
import { oprichtersplekkenOver } from '@/lib/stripe-kortingen'

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'
const DAG = 86400000
/** Vanaf dit moment gaat de lanceringsmail naar de wachtlijst (1 januari 2027, Nederlandse tijd) */
export const LANCERING = new Date('2027-01-01T00:00:00+01:00')
/** Resend gratis: 100 mails per dag. We houden ruimte over voor de andere mails. */
const PER_DAG = 70

const opmaak = (inhoud: string) => `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1A2F5A;font-size:17px;line-height:1.55">${inhoud}
  <p>Hartelijke groet,<br>Farzana<br><span style="color:#6B7280;font-size:14px">${MERK.naam} is een initiatief van ${MERK.moederbedrijf}, ${MERK.plaats}</span></p>
  <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Je ontvangt deze mail omdat je je aanmeldde voor de wachtlijst. Wil je eraf? Antwoord met "afmelden".</p></div>`
const knop = (tekst: string, url: string) =>
  `<p><a href="${url}" style="display:inline-block;padding:14px 28px;background:#C2570C;color:#fff;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(tekst)}</a></p>`

/**
 * Op 1 januari: iedereen op de wachtlijst hoort dat Clanoo open is.
 * Drie dagen later een herinnering, alleen voor wie nog geen account heeft.
 */
export async function wachtlijstLancering(nu = new Date()) {
  if (nu < LANCERING) return { lancering: 0, herinnering: 0 }
  const service = createServiceClient()
  let lancering = 0, herinnering = 0
  const over = await oprichtersplekkenOver()

  // 1. De lanceringsmail
  const { data: nieuw } = await service.from('wachtlijst').select('id, naam, email')
    .is('lancering_mail_op', null).is('afgemeld_op', null).order('aangemeld_op').limit(PER_DAG)
  for (const w of nieuw || []) {
    const { data: gezet } = await service.from('wachtlijst').update({ lancering_mail_op: new Date().toISOString() })
      .eq('id', w.id).is('lancering_mail_op', null).select('id')
    if (!gezet?.length) continue
    const voornaam = escapeHtml((w.naam || '').split(' ')[0])
    const ok = await stuurMail({
      naar: w.email, replyTo: MERK.contact,
      onderwerp: 'Clanoo is open',
      html: opmaak(`
        <p>Hoi ${voornaam},</p>
        <p>Vandaag gaat Clanoo open. Jij stond op de wachtlijst, dus je hoort het als eerste.</p>
        <p>Je begint met een gratis maand, zonder betaalgegevens. Kies je daarna een abonnement, dan betaal je als een van de eerste ${MERK.oprichters.aantal} families ${MERK.oprichters.prijs} voor het eerste jaar in plaats van ${MERK.oprichters.normaal}.</p>
        ${knop('Begin gratis', `${BASIS_URL}/registreer?bron=wachtlijst-lancering`)}
        <p>Wie de groep start, betaalt. Iedereen die je uitnodigt, doet gratis mee.</p>`),
    })
    if (ok) lancering++
    else await service.from('wachtlijst').update({ lancering_mail_op: null }).eq('id', w.id)
  }

  // 2. Drie dagen later een herinnering, alleen als er nog oprichtersplekken zijn en iemand nog geen account heeft
  if (over > 0) {
    const { data: oud } = await service.from('wachtlijst').select('id, naam, email')
      .lte('lancering_mail_op', new Date(nu.getTime() - 3 * DAG).toISOString())
      .is('lancering_herinnering_op', null).is('afgemeld_op', null).limit(PER_DAG - lancering)
    for (const w of oud || []) {
      const { data: gezet } = await service.from('wachtlijst').update({ lancering_herinnering_op: new Date().toISOString() })
        .eq('id', w.id).is('lancering_herinnering_op', null).select('id')
      if (!gezet?.length) continue
      const { count } = await service.from('users').select('id', { count: 'exact', head: true }).ilike('email', w.email)
      if (count) continue // al begonnen
      const voornaam = escapeHtml((w.naam || '').split(' ')[0])
      const ok = await stuurMail({
        naar: w.email, replyTo: MERK.contact,
        onderwerp: `Nog ${over} oprichtersplekken`,
        html: opmaak(`
          <p>Hoi ${voornaam},</p>
          <p>Clanoo is sinds 1 januari open. Van de ${MERK.oprichters.aantal} oprichtersplekken zijn er nog ${over} over.</p>
          <p>Begin met de gratis maand en kijk of het bij jullie past. Betaalgegevens heb je daarvoor niet nodig.</p>
          ${knop('Begin gratis', `${BASIS_URL}/registreer?bron=wachtlijst-herinnering`)}`),
      })
      if (ok) herinnering++
      else await service.from('wachtlijst').update({ lancering_herinnering_op: null }).eq('id', w.id)
    }
  }
  return { lancering, herinnering }
}
