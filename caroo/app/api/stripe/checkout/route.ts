import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  // Initialiseer Stripe binnen de handler zodat de build niet faalt zonder env var
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { groepId, groepNaam } = await request.json()

  if (!groepId) {
    return NextResponse.json({ error: 'Geen groep opgegeven' }, { status: 400 })
  }

  // Controleer of de groep bestaat en de user eigenaar is
  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald, eigenaar_id')
    .eq('id', groepId)
    .eq('eigenaar_id', user.id)
    .single()

  if (!groep) {
    return NextResponse.json({ error: 'Groep niet gevonden' }, { status: 404 })
  }

  if (groep.betaald) {
    return NextResponse.json({ error: 'Groep is al betaald' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: 499, // €4,99 in centen
            product_data: {
              name: 'Caroo — Zorggroep activeren',
              description: `Eenmalige activering voor zorggroep "${groep.naam || groepNaam}"`,
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/betalen/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/betalen/annuleren?groep=${groepId}`,
      customer_email: user.email,
      metadata: {
        groep_id: groepId,
        user_id: user.id,
      },
    })

    // Sla de sessie ID op in de groep
    await supabase
      .from('zorggroepen')
      .update({ stripe_session_id: session.id })
      .eq('id', groepId)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Betaling kon niet worden aangemaakt' }, { status: 500 })
  }
}
