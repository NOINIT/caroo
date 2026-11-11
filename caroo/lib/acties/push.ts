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

/** Android- of iPhone-app: het toestel-token van Firebase opslaan. aanzetten=true zet ook pop-ups aan. */
export async function slaAppTokenOp(apparaat: string, aanzetten = false) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  if (typeof apparaat !== 'string' || apparaat.length < 20 || apparaat.length > 4096) return { error: 'Ongeldig toestel' }
  const service = createServiceClient()
  const { error } = await service.from('push_abonnementen').upsert(
    { user_id: user.id, endpoint: apparaat, soort: 'fcm', p256dh: null, auth: null },
    { onConflict: 'endpoint' }
  )
  if (error) return { error: 'Opslaan lukte niet.' }
  if (aanzetten) await service.from('users').update({ melding_push: true }).eq('id', user.id)
  return { succes: true }
}

/** Staan pop-ups in de app aan voor deze gebruiker? */
export async function appMeldingenAan() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await createServiceClient().from('users').select('melding_push').eq('id', user.id).maybeSingle()
  return !!data?.melding_push
}

/** Pop-ups in de app uitzetten (het toestel blijft bekend, zodat aanzetten later snel gaat). */
export async function zetAppMeldingenUit() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  await createServiceClient().from('users').update({ melding_push: false }).eq('id', user.id)
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
  await stuurMelding([user.id], t => ({
    titel: t('melding.testTitel'),
    tekst: t('melding.testTekst'),
    url: '/dashboard',
    tag: 'test',
  }))
  return { succes: true }
}
