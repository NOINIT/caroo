import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe-kortingen'
import { bedenktijdEinde } from '@/lib/herroepen'

export interface HerroepInfo {
  groepId: string
  groepNaam: string
  subscriptionId: string
  sinds: Date
  tot: Date
  aangemaaktOp: string
}

/**
 * Mag deze gebruiker het abonnement van deze groep nog herroepen?
 * Alleen de eigenaar (die het abonnement afsloot), alleen binnen 14 dagen na het afsluiten.
 * De startdatum komt van Stripe zelf, niet uit de browser.
 */
export async function laadHerroepInfo(groepId: string, userId: string): Promise<HerroepInfo | 'verlopen' | null> {
  const { data: groep } = await createServiceClient().from('zorggroepen')
    .select('id, naam, betaald, eigenaar_id, stripe_subscription_id, aangemaakt_op')
    .eq('id', groepId).maybeSingle()
  if (!groep || groep.eigenaar_id !== userId || !groep.betaald || !groep.stripe_subscription_id) return null

  const sub = await stripeClient().subscriptions.retrieve(groep.stripe_subscription_id as string).catch(() => null)
  if (!sub || sub.status === 'canceled') return null
  const sinds = new Date(sub.start_date * 1000)
  const tot = bedenktijdEinde(sinds)
  if (tot.getTime() <= Date.now()) return 'verlopen'
  return {
    groepId: groep.id as string, groepNaam: groep.naam as string, subscriptionId: sub.id,
    sinds, tot, aangemaaktOp: groep.aangemaakt_op as string,
  }
}
