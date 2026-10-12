import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { groepId } = await request.json()

  if (!groepId) {
    return NextResponse.json({ error: 'Geen groep opgegeven' }, { status: 400 })
  }

  // Haal de groep op met subscription ID
  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, stripe_subscription_id')
    .eq('id', groepId)
    .eq('eigenaar_id', user.id)
    .single()

  if (!groep || !groep.stripe_subscription_id) {
    return NextResponse.json({ error: 'Geen actief abonnement gevonden' }, { status: 404 })
  }

  // Haal de Stripe subscription op om de customer ID te krijgen
  const subscription = await stripe.subscriptions.retrieve(groep.stripe_subscription_id)

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.customer as string,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/groep/${groepId}`,
  })

  return NextResponse.json({ url: session.url })
}
