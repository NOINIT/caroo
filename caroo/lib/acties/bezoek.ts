'use server'

import { createClient } from '@/lib/supabase/server'
import { stuurMelding, groepsledenBehalve } from '@/lib/meldingen'

export async function vraagBezoekAan(groepId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).single()
  const naam = profiel?.naam || 'De hoofdpersoon'

  // RLS controleert dat je lid bent van deze groep
  const { data, error } = await supabase
    .from('bezoekverzoeken')
    .insert({ groep_id: groepId, aangevraagd_door: user.id, aangevraagd_naam: naam })
    .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
    .single()

  if (error || !data) return { error: 'Dat lukte niet.' }

  const familie = await groepsledenBehalve(groepId, user.id)
  await stuurMelding(familie, {
    titel: `🏠 ${naam} wil graag bezoek`,
    tekst: 'Open Caroo om te laten weten wanneer je langskomt.',
    url: `/groep/${groepId}`,
    tag: `bezoek-${data.id}`,
  })

  return { verzoek: data }
}

export async function reageerOpBezoek(verzoekId: string, wanneer: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).single()
  const naam = profiel?.naam || 'Iemand'
  const schoon = (wanneer || '').trim().slice(0, 40)

  // Alleen als nog niemand heeft gereageerd (RLS: alleen groepsleden)
  const { data, error } = await supabase
    .from('bezoekverzoeken')
    .update({ reactie_door: user.id, reactie_naam: naam, reactie_wanneer: schoon, reactie_op: new Date().toISOString() })
    .eq('id', verzoekId)
    .is('reactie_door', null)
    .select('groep_id, aangevraagd_door')
    .maybeSingle()

  if (error) return { error: 'Dat lukte niet.' }
  if (!data) return { error: 'Iemand anders heeft al gereageerd.' }

  if (data.aangevraagd_door) {
    await stuurMelding([data.aangevraagd_door], {
      titel: `🎉 ${naam} komt langs!`,
      tekst: schoon ? schoon.charAt(0).toUpperCase() + schoon.slice(1) : 'Binnenkort',
      url: `/oudere/${data.groep_id}`,
      tag: `bezoek-${verzoekId}`,
    })
  }

  return { succes: true, naam }
}
