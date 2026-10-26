'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Abonnement {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function slaPushAbonnementOp(ab: Abonnement) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  if (!ab?.endpoint?.startsWith('https://') || !ab.keys?.p256dh || !ab.keys?.auth) {
    return { error: 'Ongeldig abonnement' }
  }

  const service = createServiceClient()
  const { error } = await service.from('push_abonnementen').upsert(
    { user_id: user.id, endpoint: ab.endpoint, p256dh: ab.keys.p256dh, auth: ab.keys.auth },
    { onConflict: 'endpoint' }
  )
  if (error) return { error: 'Opslaan lukte niet.' }
  await service.from('users').update({ melding_push: true }).eq('id', user.id)
  return { succes: true }
}

export async function verwijderPushAbonnement(endpoint: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  await createServiceClient().from('push_abonnementen').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  return { succes: true }
}

export async function zetEmailMeldingen(aan: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  await createServiceClient().from('users').update({ melding_email: !!aan }).eq('id', user.id)
  return { succes: true }
}

export async function stuurTestMelding() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  const { stuurMelding } = await import('@/lib/meldingen')
  await stuurMelding([user.id], {
    titel: '🔔 Meldingen staan aan',
    tekst: 'Zo ziet een melding van Clanoo eruit.',
    url: '/dashboard',
    tag: 'test',
  })
  return { succes: true }
}
