import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!)
  const { groepId, groepNaam, userId } = await request.json()

  if (!groepId || !userId) {
    return NextResponse.json({ error: 'Ontbrekende gegevens' }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { data: groep, error: groepError } = await serviceClient
    .from('zorggroepen')
    .select('id, naam, betaald, eigenaar_id')
    .eq('id', groepId)
    .eq('eigenaar_id', userId)
    .single()

  if (!groep) {
    console.error('Groep niet gevonden', { groepId, userId, groepError })
    return NextResponse.json({ error: 'Groep niet gevonden' }, { status: 404 })
  }

  if (groep.betaald) {
    return NextResponse.json({ error: 'Groep is al betaald' }, { status: 400 })
  }

  const { data: { user } } = await serviceClient.auth.admin.getUserById(userId)
  const userEmail = user?.email

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: 1999,
            recurring: { interval: 'year' },
            product_data: {
              name: 'Caroo — Zorggroep jaarabonnement',
              description: `Jaarabonnement voor zorggroep "${groep.naam || groepNaam}"`,
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/betalen/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/betalen/annuleren?groep=${groepId}`,
      customer_email: userEmail,
      metadata: {
        groep_id: groepId,
        user_id: userId,
      },
    })

    await serviceClient
      .from('zorggroepen')
      .update({ stripe_session_id: session.id })
      .eq('id', groepId)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Betaling kon niet worden aangemaakt' }, { status: 500 })
  }
}