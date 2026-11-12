import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { maakT } from '@/lib/i18n/vertaal'
import { isTaal, STANDAARD_TAAL, taalInfo } from '@/lib/i18n/talen'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'
import { isGeenEmail } from '@/lib/koppelen'

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'
const DAG = 86400000

/**
 * Twee dagen na het starten van een groep: staat er nog niemand anders in (behalve de hoofdpersoon)
 * en is er ook nog niemand uitgenodigd? Dan een mail aan wie de groep startte: nodig je familie uit,
 * het kost niets extra. Gaat maar één keer per groep.
 */
export async function uitnodigFamilie() {
  const service = createServiceClient()
  const nu = Date.now()
  const { data: groepen } = await service.from('zorggroepen')
    .select('id, naam, eigenaar_id')
    .is('uitnodig_mail_op', null)
    .is('gestopt_op', null)
    .lte('aangemaakt_op', new Date(nu - 2 * DAG).toISOString())
    .gt('aangemaakt_op', new Date(nu - 7 * DAG).toISOString())

  let verstuurd = 0
  for (const g of groepen || []) {
    const [{ count: anderen }, { count: uitgenodigd }] = await Promise.all([
      service.from('groepsleden').select('user_id', { count: 'exact', head: true })
        .eq('groep_id', g.id).neq('user_id', g.eigenaar_id).neq('rol', 'oudere'),
      service.from('uitnodigingen').select('id', { count: 'exact', head: true }).eq('groep_id', g.id),
    ])
    const { data: gezet } = await service.from('zorggroepen').update({ uitnodig_mail_op: new Date().toISOString() })
      .eq('id', g.id).is('uitnodig_mail_op', null).select('id')
    if (!gezet?.length) continue
    if ((anderen ?? 0) > 0 || (uitgenodigd ?? 0) > 0) continue // de familie is er al bij: geen mail

    const { data: wie } = await service.from('users').select('naam, email, taal').eq('id', g.eigenaar_id).maybeSingle()
    if (!wie?.email || isGeenEmail(wie.email)) continue
    const taal = isTaal(wie.taal) ? wie.taal : STANDAARD_TAAL
    const t = maakT(taal)
    const ok = await stuurMail({
      naar: wie.email, replyTo: MERK.contact,
      onderwerp: t('uitnodigMail.onderwerp', { groep: g.naam as string }),
      html: `<div dir="${taalInfo(taal).dir}" lang="${taal}" style="font-family:Arial,sans-serif;font-size:17px;line-height:1.55;color:#1A2F5A;max-width:560px">
        <p>${escapeHtml(t('herroepen.mailHallo', { naam: (wie.naam || '').split(' ')[0] }).replace(' ,', ','))}</p>
        <p>${escapeHtml(t('uitnodigMail.tekst', { groep: g.naam as string }))}</p>
        <p>${escapeHtml(t('uitnodigMail.gratis'))}</p>
        <p><a href="${BASIS_URL}/groep/${g.id}/uitnodigen" style="display:inline-block;padding:14px 28px;background:#1A7A6E;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(t('uitnodigMail.knop'))}</a></p>
        <p>${escapeHtml(t('herroepen.mailGroet'))}<br>Clanoo · NOINIT</p></div>`,
    })
    if (ok) verstuurd++
  }
  return { verstuurd }
}
