import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { maakT } from '@/lib/i18n/vertaal'
import { MERK } from '@/lib/merk'

export async function POST(request: Request) {
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Geen Stripe signature' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook verificatie mislukt:', err)
    return NextResponse.json({ error: 'Webhook verificatie mislukt' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verwerk checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // 'no_payment_required': abonnement afgesloten tijdens de gratis maand; het betalen begint later
    if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
      const groepId = session.metadata?.groep_id

      if (!groepId) {
        console.error('Geen groep_id in metadata')
        return NextResponse.json({ error: 'Geen groep_id' }, { status: 400 })
      }

      const { data: geactiveerd, error } = await supabase
        .from('zorggroepen')
        .update({
          betaald: true,
          gestopt_op: null,
          stripe_session_id: session.id,
          stripe_subscription_id: session.subscription ?? null,
          // Vanaf nu loopt de bedenktijd van 14 dagen (herroepen)
          abonnement_sinds: new Date().toISOString(),
          herroepen_op: null,
        })
        .eq('id', groepId)
        .eq('betaald', false)
        .select('naam')

      if (error) {
        console.error('Update groep mislukt:', error)
        return NextResponse.json({ error: 'Update mislukt' }, { status: 500 })
      }

      // Bevestiging met de bedenktijd erin, in de taal van wie betaalde (één keer, alleen bij een nieuwe activering)
      const naar = session.customer_details?.email || session.customer_email
      if (geactiveerd?.length && naar) {
        const { data: wie } = session.metadata?.user_id
          ? await supabase.from('users').select('naam, taal').eq('id', session.metadata.user_id).maybeSingle()
          : { data: null }
        const t = maakT((wie?.taal as any) || 'nl')
        await stuurMail({
          naar,
          onderwerp: t('herroepen.welkomOnderwerp'),
          replyTo: MERK.contact,
          html: `<div style="font-family:Arial,sans-serif;font-size:17px;line-height:1.55;color:#1A2F5A;max-width:560px">
            <p>${escapeHtml(t('herroepen.mailHallo', { naam: (wie?.naam || '').split(' ')[0] }).replace(' ,', ','))}</p>
            <p>${escapeHtml(t('herroepen.welkomTekst', { groep: geactiveerd[0].naam as string }))}</p>
            <p>${escapeHtml(t('herroepen.welkomBedenk'))}</p>
            <p>${escapeHtml(t('herroepen.mailGroet'))}<br>Clanoo · NOINIT</p></div>`,
        })
      }

      console.log(`✅ Groep ${groepId} geactiveerd, abonnement ${session.subscription}`)
    }
  }

  // Verwerk opzegging abonnement
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const subscriptionId = subscription.id

    // Herroepen: dat regelt lib/acties/herroepen.ts zelf (de gratis maand kan dan doorlopen)
    if (subscription.metadata?.herroepen === '1') {
      return NextResponse.json({ ontvangen: true })
    }

    const { error } = await supabase
      .from('zorggroepen')
      // Gestopt: de familie kan nog 30 dagen de verhalen downloaden (zie lib/opzeggen.ts)
      .update({ betaald: false, gestopt_op: new Date().toISOString() })
      .eq('stripe_subscription_id', subscriptionId)

    if (error) {
      console.error('Deactivering groep mislukt:', error)
    } else {
      console.log(`⚠️ Abonnement ${subscriptionId} beëindigd — groep gedeactiveerd`)
    }
  }

  return NextResponse.json({ ontvangen: true })
}
