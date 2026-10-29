import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getT } from '@/lib/i18n/server'
import { stripeTaal } from '@/lib/i18n/talen'
import { PRIJS, isPlan } from '@/lib/prijzen'
import { proefEinde } from '@/lib/opzeggen'
import { stripeClient, startkorting, oprichterskorting, oprichtersplekkenOver } from '@/lib/stripe-kortingen'

export async function POST(request: Request) {
  const { t, taal } = await getT()
  const { groepId, plan } = await request.json()

  // Wie is ingelogd? Niet vertrouwen op wat de browser meestuurt.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('auth.vulAlles') }, { status: 401 })
  if (!groepId || !isPlan(plan)) return NextResponse.json({ error: t('auth.vulAlles') }, { status: 400 })

  const serviceClient = createServiceClient()
  const { data: groep, error: groepError } = await serviceClient
    .from('zorggroepen')
    .select('id, naam, betaald, eigenaar_id, aangemaakt_op, gestopt_op')
    .eq('id', groepId)
    .eq('eigenaar_id', user.id)
    .single()

  if (!groep) {
    console.error('Groep niet gevonden', { groepId, userId: user.id, groepError })
    return NextResponse.json({ error: t('betalen.groepNietGevonden') }, { status: 404 })
  }
  if (groep.betaald) return NextResponse.json({ error: t('betalen.alBetaald') }, { status: 400 })

  const stripe = stripeClient()

  try {
    const perJaar = plan !== 'maand'
    const korting = plan === 'maand' ? await startkorting(stripe) : plan === 'oprichter' ? await oprichterskorting(stripe) : null
    if (plan === 'oprichter' && (await oprichtersplekkenOver()) <= 0) {
      return NextResponse.json({ error: t('betalen.oprichtersVol') }, { status: 400 })
    }

    // Loopt de gratis maand nog? Dan begint het betalen pas als die voorbij is.
    // Stripe wil minimaal 48 uur vooruit; anders begint het meteen.
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { groep_id: groep.id, plan },
    }
    if (!groep.gestopt_op && groep.aangemaakt_op) {
      const einde = proefEinde(groep.aangemaakt_op).getTime()
      if (einde - Date.now() > 49 * 3600 * 1000) subscriptionData.trial_end = Math.floor(einde / 1000)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: (perJaar ? PRIJS.jaar : PRIJS.maand) * 100,
          recurring: { interval: perJaar ? 'year' : 'month' },
          product_data: {
            name: perJaar ? t('betalen.stripeJaar') : t('betalen.stripeMaand'),
            description: t('betalen.stripeOmschrijving', { groep: groep.naam }),
          },
        },
      }],
      ...(korting ? { discounts: [{ coupon: korting.id }] } : {}),
      subscription_data: subscriptionData,
      locale: stripeTaal(taal),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/betalen/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/betalen?groep=${groep.id}&naam=${encodeURIComponent(groep.naam)}`,
      customer_email: user.email || undefined,
      metadata: { groep_id: groep.id, user_id: user.id, plan },
    })

    await serviceClient.from('zorggroepen').update({ stripe_session_id: session.id }).eq('id', groep.id)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: t('betalen.nietAangemaakt') }, { status: 500 })
  }
}

/** Hoeveel oprichtersplekken zijn er nog (voor de betaalpagina)? */
export async function GET() {
  return NextResponse.json({ oprichtersOver: await oprichtersplekkenOver() })
}
