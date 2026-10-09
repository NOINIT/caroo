import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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

  // Verwerk alleen checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    if (session.payment_status === 'paid') {
      const groepId = session.metadata?.groep_id

      if (!groepId) {
        console.error('Geen groep_id in metadata')
        return NextResponse.json({ error: 'Geen groep_id' }, { status: 400 })
      }

      // Gebruik service client voor idempotente update (RLS bypass)
      const supabase = createServiceClient()

      const { error } = await supabase
        .from('zorggroepen')
        .update({
          betaald: true,
          stripe_session_id: session.id,
        })
        .eq('id', groepId)
        .eq('betaald', false) // Idempotent: werkt niet als al betaald

      if (error) {
        console.error('Update groep mislukt:', error)
        return NextResponse.json({ error: 'Update mislukt' }, { status: 500 })
      }

      console.log(`✅ Groep ${groepId} geactiveerd via Stripe sessie ${session.id}`)
    }
  }

  return NextResponse.json({ ontvangen: true })
}
