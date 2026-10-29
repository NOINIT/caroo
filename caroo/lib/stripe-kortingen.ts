import 'server-only'
import Stripe from 'stripe'
import { PRIJS } from '@/lib/prijzen'

// Kortingen in Stripe. Ze worden de eerste keer vanzelf aangemaakt (vaste id's),
// zodat er in het Stripe-dashboard niets met de hand ingesteld hoeft te worden.
// Nieuwe id sinds de prijs van €149 naar €125 ging: een kortingscode kan in Stripe niet worden aangepast
export const KORTING_OPRICHTER = 'clanoo-oprichter-2027-125'

export function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

async function haalOfMaak(stripe: Stripe, id: string, maak: Stripe.CouponCreateParams) {
  try {
    return await stripe.coupons.retrieve(id)
  } catch {
    return await stripe.coupons.create({ ...maak, id })
  }
}

/** Oprichtersprijs: het eerste jaar €56 korting op €125, dus €69. Maximaal 100 keer. */
export function oprichterskorting(stripe: Stripe) {
  return haalOfMaak(stripe, KORTING_OPRICHTER, {
    name: `Oprichtersprijs: eerste jaar €${PRIJS.oprichter}`,
    amount_off: Math.round((PRIJS.jaar - PRIJS.oprichter) * 100),
    currency: 'eur',
    // Twee maanden: valt altijd over de eerste jaarfactuur (ook na een gratis maand),
    // nooit over de tweede.
    duration: 'repeating',
    duration_in_months: 2,
    max_redemptions: PRIJS.oprichterPlekken,
  })
}

/** Hoeveel oprichtersplekken zijn er nog? */
export async function oprichtersplekkenOver(): Promise<number> {
  try {
    const stripe = stripeClient()
    const c = await stripe.coupons.retrieve(KORTING_OPRICHTER)
    if (!c.valid) return 0
    return Math.max(0, PRIJS.oprichterPlekken - (c.times_redeemed ?? 0))
  } catch {
    // Nog niet aangemaakt: niemand heeft hem gebruikt
    return PRIJS.oprichterPlekken
  }
}
