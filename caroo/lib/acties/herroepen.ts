'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'
import { datum, tijd } from '@/lib/i18n/vertaal'
import { stripeClient } from '@/lib/stripe-kortingen'
import { laadHerroepInfo } from '@/lib/herroepen-server'
import { proefEinde } from '@/lib/opzeggen'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'

/**
 * Herroep het abonnement binnen de bedenktijd (EU-richtlijn 2023/2673).
 * Stopt het abonnement meteen, betaalt alles terug en stuurt een ontvangstbevestiging.
 * Loopt de gratis maand nog, dan gaat de groep gewoon verder in de gratis maand.
 */
export async function herroep(groepId: string, naamInvoer: string) {
  const { t, taal } = await getT()
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const info = await laadHerroepInfo(groepId, user.id)
  if (info === 'verlopen') return { error: t('herroepen.verlopen') }
  if (!info) return { error: t('herroepen.mislukt') }

  const naam = (naamInvoer || '').trim().slice(0, 80) || (user.email ?? '')
  const moment = new Date()
  const stripe = stripeClient()

  try {
    // Eerst markeren, zodat de webhook bij het stoppen de groep niet op "gestopt" zet
    const sub = await stripe.subscriptions.update(info.subscriptionId, { metadata: { groep_id: groepId, herroepen: '1' } })
    const klant = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

    // Openstaande facturen vervallen, betaalde bedragen gaan volledig terug
    const open = await stripe.invoices.list({ subscription: sub.id, status: 'open', limit: 20 })
    for (const f of open.data) if (f.id) await stripe.invoices.voidInvoice(f.id).catch(() => {})
    const betalingen = await stripe.charges.list({ customer: klant, limit: 20 })
    for (const c of betalingen.data) {
      if (c.paid && c.amount > c.amount_refunded && c.created >= sub.start_date - 3600) {
        await stripe.refunds.create({ charge: c.id, metadata: { groep_id: groepId, reden: 'herroeping' } })
      }
    }
    await stripe.subscriptions.cancel(sub.id)
  } catch (e) {
    console.error('Herroepen mislukt', groepId, e)
    return { error: t('herroepen.mislukt') }
  }

  const proefTot = proefEinde(info.aangemaaktOp)
  const nogProef = proefTot.getTime() > Date.now()
  await createServiceClient().from('zorggroepen').update({
    betaald: false,
    herroepen_op: moment.toISOString(),
    gestopt_op: nogProef ? null : moment.toISOString(),
  }).eq('id', groepId)

  // Ontvangstbevestiging aan de klant, en een seintje aan ons
  const overeenkomst = t('herroepen.overeenkomstTekst', { groep: info.groepNaam, datum: datum(taal, info.sinds, { day: 'numeric', month: 'long', year: 'numeric' }) })
  const wanneer = `${datum(taal, moment, { day: 'numeric', month: 'long', year: 'numeric' })} ${tijd(taal, moment)}`
  if (user.email) {
    await stuurMail({
      naar: user.email,
      onderwerp: t('herroepen.mailOnderwerp'),
      replyTo: MERK.contact,
      html: `<div style="font-family:Arial,sans-serif;font-size:17px;line-height:1.55;color:#1A2F5A;max-width:560px">
        <p>${escapeHtml(t('herroepen.mailHallo', { naam: naam.split(' ')[0] }))}</p>
        <p>${escapeHtml(t('herroepen.mailOntvangen', { moment: wanneer }))}<br>${escapeHtml(t('herroepen.mailOver', { overeenkomst }))}</p>
        <p>${escapeHtml(t('herroepen.mailGestopt'))}</p>
        <p>${escapeHtml(t('herroepen.mailGroet'))}<br>Clanoo · NOINIT</p></div>`,
    })
  }
  await stuurMail({
    naar: MERK.contact,
    onderwerp: `Herroeping: ${info.groepNaam}`,
    html: `<p>Herroeping ontvangen op ${escapeHtml(wanneer)}.</p>
      <p>Naam: ${escapeHtml(naam)}<br>E-mail: ${escapeHtml(user.email || '-')}<br>Overeenkomst: ${escapeHtml(overeenkomst)}<br>
      Groep: ${escapeHtml(groepId)}<br>Abonnement: ${escapeHtml(info.subscriptionId)}</p>
      <p>Het abonnement is gestopt in Stripe en betaalde bedragen zijn teruggeboekt. Controleer dat in Stripe.</p>`,
  })

  revalidatePath(`/groep/${groepId}`)
  return {
    ok: true,
    proefTot: nogProef ? proefTot.toISOString() : null,
  }
}
