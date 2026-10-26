'use server'

import { createClient } from '@/lib/supabase/server'
import { stuurMelding, groepsledenBehalve } from '@/lib/meldingen'
import { getT } from '@/lib/i18n/server'
import { wanneerTekst, hoofdletter } from '@/lib/i18n/vertaal'

export async function vraagBezoekAan(groepId: string) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).single()
  const naam = profiel?.naam || t('algemeen.deHoofdpersoon')

  // RLS controleert dat je lid bent van deze groep
  const { data, error } = await supabase
    .from('bezoekverzoeken')
    .insert({ groep_id: groepId, aangevraagd_door: user.id, aangevraagd_naam: naam })
    .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
    .single()

  if (error || !data) return { error: t('algemeen.lukteNiet') }

  const familie = await groepsledenBehalve(groepId, user.id)
  await stuurMelding(familie, tt => ({
    titel: tt('bezoek.meldingTitel', { naam }),
    tekst: tt('bezoek.meldingTekst'),
    url: `/groep/${groepId}`,
    tag: `bezoek-${data.id}`,
  }))

  return { verzoek: data }
}

export async function reageerOpBezoek(verzoekId: string, wanneer: string) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).single()
  const naam = profiel?.naam || t('algemeen.iemand')
  const schoon = (wanneer || '').trim().slice(0, 40)

  // Alleen als nog niemand heeft gereageerd (RLS: alleen groepsleden)
  const { data, error } = await supabase
    .from('bezoekverzoeken')
    .update({ reactie_door: user.id, reactie_naam: naam, reactie_wanneer: schoon, reactie_op: new Date().toISOString() })
    .eq('id', verzoekId)
    .is('reactie_door', null)
    .select('groep_id, aangevraagd_door')
    .maybeSingle()

  if (error) return { error: t('algemeen.lukteNiet') }
  if (!data) return { error: t('bezoek.alGereageerd') }

  if (data.aangevraagd_door) {
    await stuurMelding([data.aangevraagd_door], tt => ({
      titel: tt('bezoek.komtLangsTitel', { naam }),
      tekst: schoon ? hoofdletter(wanneerTekst(tt, schoon)) : tt('wanneer.binnenkort'),
      url: `/oudere/${data.groep_id}`,
      tag: `bezoek-${verzoekId}`,
    }))
  }

  return { succes: true, naam }
}
