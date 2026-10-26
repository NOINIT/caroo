import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getT } from '@/lib/i18n/server'
import { stripeTaal } from '@/lib/i18n/talen'

export async function POST(request: Request) {
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!)
  const supabase = createClient()
  const { t, taal } = await getT()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: t('algemeen.nietIngelogd') }, { status: 401 })
  }

  const { groepId } = await request.json()

  if (!groepId) {
    return NextResponse.json({ error: t('betalen.groepNietGevonden') }, { status: 400 })
  }

  // Haal de groep op met subscription ID
  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, stripe_subscription_id')
    .eq('id', groepId)
    .eq('eigenaar_id', user.id)
    .single()

  if (!groep || !groep.stripe_subscription_id) {
    return NextResponse.json({ error: t('betalen.geenAbonnement') }, { status: 404 })
  }

  // Haal de Stripe subscription op om de customer ID te krijgen
  const subscription = await stripe.subscriptions.retrieve(groep.stripe_subscription_id)

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.customer as string,
    locale: stripeTaal(taal),
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/groep/${groepId}`,
  })

  return NextResponse.json({ url: session.url })
}
