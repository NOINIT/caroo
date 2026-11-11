import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { maakT } from '@/lib/i18n/vertaal'
import { isTaal, STANDAARD_TAAL, taalInfo } from '@/lib/i18n/talen'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'
import { isGeenEmail } from '@/lib/koppelen'
import { PRIJS } from '@/lib/prijzen'
import { proefEinde } from '@/lib/opzeggen'

export const dynamic = 'force-dynamic'

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'
const DAG = 86400000

/**
 * Elke ochtend (Vercel Cron): herinner wie een groep startte dat de gratis maand bijna voorbij is.
 * Mail 1 gaat 5 dagen voor het einde, mail 2 op de laatste dag. Elke mail gaat maar één keer:
 * de tijdstempel wordt eerst gezet, daarna pas verstuurd. Daarom kan deze route geen kwaad als
 * iemand anders hem aanroept; met CRON_SECRET in Vercel is hij bovendien afgeschermd.
 */
export async function GET(request: NextRequest) {
  const geheim = process.env.CRON_SECRET
  if (geheim && request.headers.get('authorization') !== `Bearer ${geheim}`) {
    return NextResponse.json({ fout: 'Geen toegang' }, { status: 401 })
  }

  const service = createServiceClient()
  const nu = Date.now()
  // Alleen groepen waarvan de gratis maand de komende 5 dagen afloopt
  const vanaf = new Date(nu - PRIJS.proefDagen * DAG).toISOString()
  const tot = new Date(nu - (PRIJS.proefDagen - 5) * DAG).toISOString()
  const { data: groepen } = await service
    .from('zorggroepen')
    .select('id, naam, aangemaakt_op, eigenaar_id, proef_herinnering_5_op, proef_herinnering_laatst_op')
    .eq('betaald', false)
    .is('gestopt_op', null)
    .gt('aangemaakt_op', vanaf)
    .lte('aangemaakt_op', tot)

  let verstuurd = 0
  for (const g of groepen || []) {
    const einde = proefEinde(g.aangemaakt_op as string)
    const over = einde.getTime() - nu
    if (over <= 0) continue
    const laatste = over <= DAG
    const kolom = laatste ? 'proef_herinnering_laatst_op' : 'proef_herinnering_5_op'
    if (g[kolom]) continue

    // Eerst vastleggen (alleen als het nog leeg is), dan pas mailen: nooit twee keer dezelfde mail
    const { data: gezet } = await service.from('zorggroepen').update({ [kolom]: new Date().toISOString() })
      .eq('id', g.id).is(kolom, null).select('id')
    if (!gezet?.length) continue

    const { data: wie } = await service.from('users').select('naam, email, taal').eq('id', g.eigenaar_id).maybeSingle()
    if (!wie?.email || isGeenEmail(wie.email)) continue
    const taal = isTaal(wie.taal) ? wie.taal : STANDAARD_TAAL
    const t = maakT(taal)
    const datum = new Intl.DateTimeFormat(taalInfo(taal).locale || 'nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' }).format(einde)
    const voornaam = (wie.naam || '').split(' ')[0]
    const link = `${BASIS_URL}/betalen?groep=${g.id}&naam=${encodeURIComponent(g.naam as string)}`
    const sleutel = laatste ? 'proefMail.laatst' : 'proefMail.vijf'

    const ok = await stuurMail({
      naar: wie.email,
      replyTo: MERK.contact,
      onderwerp: t(`${sleutel}Onderwerp`, { groep: g.naam as string }),
      html: `<div dir="${taalInfo(taal).dir}" lang="${taal}" style="font-family:Arial,sans-serif;font-size:17px;line-height:1.55;color:#1A2F5A;max-width:560px">
        <p>${escapeHtml(t('herroepen.mailHallo', { naam: voornaam }).replace(' ,', ','))}</p>
        <p>${escapeHtml(t(`${sleutel}Tekst`, { groep: g.naam as string, datum }))}</p>
        <p>${escapeHtml(t('proefMail.gratisMee'))}</p>
        <p><a href="${link}" style="display:inline-block;padding:14px 28px;background:#1A7A6E;color:#fff;border-radius:10px;text-decoration:none;font-size:17px;font-weight:bold">${escapeHtml(t('proefMail.knop'))}</a></p>
        <p>${escapeHtml(t('proefMail.niets'))}</p>
        <p>${escapeHtml(t('herroepen.mailGroet'))}<br>Clanoo · NOINIT</p></div>`,
    })
    if (ok) verstuurd++
    else await service.from('zorggroepen').update({ [kolom]: null }).eq('id', g.id) // morgen opnieuw proberen
  }

  return NextResponse.json({ bekeken: groepen?.length || 0, verstuurd })
}
