import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'
import { oprichtersplekkenOver } from '@/lib/stripe-kortingen'
import { afmeldVoet } from '@/lib/wachtlijst-afmelden'

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'
const DAG = 86400000
/** Hooguit zoveel lanceringsmails per dag, zodat er ruimte blijft voor de andere mails. */
const PER_DAG = 70

/**
 * De lanceringsdatum staat niet in de code maar in de afgeschermde tabel 'instellingen',
 * onder de naam 'lancering_op' (bijvoorbeeld 2027-01-01T10:00:00+01:00).
 * Zolang daar niets staat, gaat er geen lanceringsmail uit.
 */
export async function lanceringOp(): Promise<Date | null> {
  const { data } = await createServiceClient().from('instellingen').select('waarde').eq('naam', 'lancering_op').maybeSingle()
  const d = data?.waarde ? new Date(data.waarde) : null
  return d && !isNaN(d.getTime()) ? d : null
}

type Taal = 'nl' | 'en' | 'tr'
const taalVan = (x: unknown): Taal => (x === 'en' || x === 'tr' ? x : 'nl')

const O = MERK.oprichters
const T = {
  nl: {
    groet: 'Hartelijke groet,', initiatief: `${MERK.naam} is een initiatief van ${MERK.moederbedrijf}, ${MERK.plaats}`,
    hoi: (v: string) => `Hoi ${v},`, knop: 'Begin gratis',
    openOnderwerp: 'Clanoo is open',
    open1: 'Vandaag gaat Clanoo open. Jij stond op de wachtlijst, dus je hoort het als eerste.',
    open2: 'Je begint met een gratis maand, zonder betaalgegevens.',
    openPlekken: (over: number) => ` Neem je een abonnement terwijl er nog oprichtersplekken zijn, dan betaal je ${O.prijs} voor het eerste jaar in plaats van ${O.normaal}. Van de ${O.aantal} plekken zijn er nog ${over} over.`,
    open3: 'Wie de groep start, betaalt. Iedereen die je uitnodigt, doet gratis mee.',
    herOnderwerp: (over: number) => `Nog ${over} oprichtersplekken`,
    her1: (over: number) => `Clanoo is nu een paar dagen open. Van de ${O.aantal} oprichtersplekken zijn er nog ${over} over.`,
    her2: 'Begin met de gratis maand en kijk of het bij jullie past. Betaalgegevens heb je daarvoor niet nodig.',
  },
  en: {
    groet: 'Kind regards,', initiatief: `${MERK.naam} is an initiative of ${MERK.moederbedrijf}, ${MERK.plaats}`,
    hoi: (v: string) => `Hi ${v},`, knop: 'Start for free',
    openOnderwerp: 'Clanoo is open',
    open1: 'Clanoo opens today. You were on the waiting list, so you are the first to hear.',
    open2: 'You start with a free month, without payment details.',
    openPlekken: (over: number) => ` If you take a subscription while founder places are still available, you pay ${O.prijs} for the first year instead of ${O.normaal}. Of the ${O.aantal} places, ${over} are left.`,
    open3: 'Whoever starts the group pays. Everyone you invite joins for free.',
    herOnderwerp: (over: number) => `${over} founder places left`,
    her1: (over: number) => `Clanoo has been open for a few days now. Of the ${O.aantal} founder places, ${over} are left.`,
    her2: 'Start with the free month and see if it suits your family. You don’t need payment details for that.',
  },
  tr: {
    groet: 'Sevgiler,', initiatief: `${MERK.naam}, ${MERK.plaats}’teki ${MERK.moederbedrijf}’in bir girişimidir`,
    hoi: (v: string) => `Merhaba ${v},`, knop: 'Ücretsiz başla',
    openOnderwerp: 'Clanoo açıldı',
    open1: 'Clanoo bugün açılıyor. Bekleme listesindeydin, bu yüzden ilk sen duyuyorsun.',
    open2: 'Ödeme bilgisi vermeden, ücretsiz bir ayla başlıyorsun.',
    openPlekken: (over: number) => ` Kurucu yerleri dolmadan abone olursan ilk yıl için ${O.normaal} yerine ${O.prijs} ödersin. ${O.aantal} yerden ${over} tanesi kaldı.`,
    open3: 'Grubu başlatan öder. Davet ettiğin herkes ücretsiz katılır.',
    herOnderwerp: (over: number) => `${over} kurucu yeri kaldı`,
    her1: (over: number) => `Clanoo birkaç gündür açık. ${O.aantal} kurucu yerinden ${over} tanesi kaldı.`,
    her2: 'Ücretsiz ayla başla ve size uyup uymadığını gör. Bunun için ödeme bilgisine ihtiyacın yok.',
  },
}

const opmaak = (inhoud: string, code: string, taal: Taal) => `<div lang="${taal}" style="font-family:Arial,sans-serif;max-width:520px;color:#1A2F5A;font-size:17px;line-height:1.55">${inhoud}
  <p>${T[taal].groet}<br>Clanoo<br><span style="color:#6B7280;font-size:14px">${T[taal].initiatief}</span></p>
  ${afmeldVoet(code, taal)}</div>`
const knop = (tekst: string, url: string) =>
  `<p><a href="${url}" style="display:inline-block;padding:14px 28px;background:#C2570C;color:#fff;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(tekst)}</a></p>`

/**
 * Op de lanceringsdag: iedereen op de wachtlijst hoort dat Clanoo open is.
 * Drie dagen later een herinnering, alleen voor wie nog geen account heeft.
 */
export async function wachtlijstLancering(nu = new Date()) {
  const lancering_op = await lanceringOp()
  if (!lancering_op || nu < lancering_op) return { lancering: 0, herinnering: 0 }
  const service = createServiceClient()
  let lancering = 0, herinnering = 0
  const over = await oprichtersplekkenOver()

  // 1. De lanceringsmail
  const { data: nieuw } = await service.from('wachtlijst').select('id, naam, email, afmeld_code, taal')
    .is('lancering_mail_op', null).is('afgemeld_op', null).order('aangemeld_op').limit(PER_DAG)
  for (const w of nieuw || []) {
    const { data: gezet } = await service.from('wachtlijst').update({ lancering_mail_op: new Date().toISOString() })
      .eq('id', w.id).is('lancering_mail_op', null).select('id')
    if (!gezet?.length) continue
    const voornaam = escapeHtml((w.naam || '').split(' ')[0])
    const taal = taalVan(w.taal)
    const t = T[taal]
    const ok = await stuurMail({
      naar: w.email, replyTo: MERK.contact,
      onderwerp: t.openOnderwerp,
      html: opmaak(`
        <p>${t.hoi(voornaam)}</p>
        <p>${t.open1}</p>
        <p>${t.open2}${over > 0 ? t.openPlekken(over) : ''}</p>
        ${knop(t.knop, `${BASIS_URL}/registreer?bron=wachtlijst-lancering`)}
        <p>${t.open3}</p>`, w.afmeld_code, taal),
    })
    if (ok) lancering++
    else await service.from('wachtlijst').update({ lancering_mail_op: null }).eq('id', w.id)
  }

  // 2. Drie dagen later een herinnering, alleen als er nog oprichtersplekken zijn en iemand nog geen account heeft
  if (over > 0) {
    const { data: oud } = await service.from('wachtlijst').select('id, naam, email, afmeld_code, taal')
      .lte('lancering_mail_op', new Date(nu.getTime() - 3 * DAG).toISOString())
      .is('lancering_herinnering_op', null).is('afgemeld_op', null).limit(PER_DAG - lancering)
    for (const w of oud || []) {
      const { data: gezet } = await service.from('wachtlijst').update({ lancering_herinnering_op: new Date().toISOString() })
        .eq('id', w.id).is('lancering_herinnering_op', null).select('id')
      if (!gezet?.length) continue
      const { count } = await service.from('users').select('id', { count: 'exact', head: true }).ilike('email', w.email)
      if (count) continue // al begonnen
      const voornaam = escapeHtml((w.naam || '').split(' ')[0])
      const taal = taalVan(w.taal)
      const t = T[taal]
      const ok = await stuurMail({
        naar: w.email, replyTo: MERK.contact,
        onderwerp: t.herOnderwerp(over),
        html: opmaak(`
          <p>${t.hoi(voornaam)}</p>
          <p>${t.her1(over)}</p>
          <p>${t.her2}</p>
          ${knop(t.knop, `${BASIS_URL}/registreer?bron=wachtlijst-herinnering`)}`, w.afmeld_code, taal),
      })
      if (ok) herinnering++
      else await service.from('wachtlijst').update({ lancering_herinnering_op: null }).eq('id', w.id)
    }
  }
  return { lancering, herinnering }
}
