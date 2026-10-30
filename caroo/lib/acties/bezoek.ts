'use server'

import { createClient } from '@/lib/supabase/server'
import { stuurMelding, groepsledenBehalve } from '@/lib/meldingen'
import { getT } from '@/lib/i18n/server'
import { wanneerTekst, hoofdletter } from '@/lib/i18n/vertaal'
import { BEL_GELDIG_UUR } from '@/lib/stemming'

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

/** De hoofdpersoon wil graag gebeld worden (na een sombere smiley) */
export async function vraagBelAan(groepId: string) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  // Staat er al een open belverzoek? Dan niet nog eens iedereen storen.
  const sinds = new Date(Date.now() - BEL_GELDIG_UUR * 3600 * 1000).toISOString()
  const { data: open } = await supabase
    .from('bezoekverzoeken')
    .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
    .eq('groep_id', groepId).eq('aangevraagd_door', user.id).eq('soort', 'bellen')
    .is('reactie_door', null).gt('aangemaakt_op', sinds)
    .limit(1).maybeSingle()
  if (open) return { verzoek: open }

  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).single()
  const naam = profiel?.naam || t('algemeen.deHoofdpersoon')
  const { data, error } = await supabase
    .from('bezoekverzoeken')
    .insert({ groep_id: groepId, aangevraagd_door: user.id, aangevraagd_naam: naam, soort: 'bellen' })
    .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
    .single()
  if (error || !data) return { error: t('algemeen.lukteNiet') }

  const familie = await groepsledenBehalve(groepId, user.id)
  await stuurMelding(familie, tt => ({
    titel: tt('bezoek.belMeldingTitel', { naam }),
    tekst: tt('bezoek.belMeldingTekst'),
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
    .select('groep_id, aangevraagd_door, aangevraagd_naam, soort')
    .maybeSingle()

  if (error) return { error: t('algemeen.lukteNiet') }
  if (!data) {
    // Iemand anders was net eerder: laat zien wie
    const { data: al } = await supabase.from('bezoekverzoeken').select('reactie_naam, reactie_wanneer').eq('id', verzoekId).maybeSingle()
    return { alGeregeld: true, naam: al?.reactie_naam ?? null, wanneer: al?.reactie_wanneer ?? null }
  }
  const bellen = data.soort === 'bellen'
  const hoofdpersoon = data.aangevraagd_naam || t('algemeen.deHoofdpersoon')

  // De rest van de familie: het is geregeld. Zelfde tag, dus dit vervangt het eerdere verzoek op hun telefoon.
  const anderen = (await groepsledenBehalve(data.groep_id, user.id)).filter(id => id !== data.aangevraagd_door)
  await stuurMelding(anderen, tt => ({
    titel: bellen
      ? tt('bezoek.belGeregeldTitel', { naam, hoofdpersoon })
      : tt('bezoek.geregeldTitel', { naam, hoofdpersoon }),
    tekst: bellen || !schoon ? tt('bezoek.geregeldTekst') : `${hoofdletter(wanneerTekst(tt, schoon))}. ${tt('bezoek.geregeldTekst')}`,
    url: `/groep/${data.groep_id}`,
    tag: `bezoek-${verzoekId}`,
  }))

  if (bellen && data.aangevraagd_door) {
    await stuurMelding([data.aangevraagd_door], tt => ({
      titel: tt('bezoek.belKomtTitel', { naam }),
      tekst: tt('bezoek.belKomtTekst'),
      url: `/oudere/${data.groep_id}`,
      tag: `bezoek-${verzoekId}`,
    }))
  } else if (data.aangevraagd_door) {
    await stuurMelding([data.aangevraagd_door], tt => ({
      titel: tt('bezoek.komtLangsTitel', { naam }),
      tekst: schoon ? hoofdletter(wanneerTekst(tt, schoon)) : tt('wanneer.binnenkort'),
      url: `/oudere/${data.groep_id}`,
      tag: `bezoek-${verzoekId}`,
    }))
  }

  return { succes: true, naam }
}
