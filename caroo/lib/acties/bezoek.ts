'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stuurMelding, groepsledenBehalve } from '@/lib/meldingen'
import { getT } from '@/lib/i18n/server'
import { wanneerTekst, hoofdletter } from '@/lib/i18n/vertaal'
import { BEL_GELDIG_UUR, BEZOEK_GELDIG_UUR } from '@/lib/stemming'

export async function vraagBezoekAan(groepId: string) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  // Staat er al een open bezoekverzoek? Dan dat laten zien, niet nog een.
  const geldig = new Date(Date.now() - BEZOEK_GELDIG_UUR * 3600 * 1000).toISOString()
  const { data: open } = await supabase
    .from('bezoekverzoeken')
    .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
    .eq('groep_id', groepId).eq('aangevraagd_door', user.id).eq('soort', 'bezoek')
    .is('reactie_door', null).is('ingetrokken_op', null).gt('aangemaakt_op', geldig)
    .limit(1).maybeSingle()
  if (open) return { verzoek: open }

  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).single()
  const naam = profiel?.naam || t('algemeen.deHoofdpersoon')
  const alGemeld = await vandaagAlGemeld(groepId, user.id, 'bezoek')

  // RLS controleert dat je lid bent van deze groep
  const { data, error } = await supabase
    .from('bezoekverzoeken')
    .insert({ groep_id: groepId, aangevraagd_door: user.id, aangevraagd_naam: naam })
    .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
    .single()

  if (error || !data) return { error: t('algemeen.lukteNiet') }
  // Vandaag al eens gevraagd (en ingetrokken)? Het verzoek staat er, maar de familie krijgt niet nog een melding.
  if (alGemeld) return { verzoek: data }

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
    .is('reactie_door', null).is('ingetrokken_op', null).gt('aangemaakt_op', sinds)
    .limit(1).maybeSingle()
  if (open) return { verzoek: open }
  const alGemeld = await vandaagAlGemeld(groepId, user.id, 'bellen')

  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).single()
  const naam = profiel?.naam || t('algemeen.deHoofdpersoon')
  const { data, error } = await supabase
    .from('bezoekverzoeken')
    .insert({ groep_id: groepId, aangevraagd_door: user.id, aangevraagd_naam: naam, soort: 'bellen' })
    .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
    .single()
  if (error || !data) return { error: t('algemeen.lukteNiet') }
  if (alGemeld) return { verzoek: data }

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

  // Eerst met je eigen rechten kijken of je dit verzoek mag zien (dus lid bent van de groep).
  // Het bijwerken zelf gaat via de server: de database laat leden een verzoek niet rechtstreeks aanpassen.
  const { data: zichtbaar } = await supabase.from('bezoekverzoeken').select('id').eq('id', verzoekId).maybeSingle()
  if (!zichtbaar) return { error: t('algemeen.lukteNiet') }

  const service = createServiceClient()
  const { data: verzoek } = await service
    .from('bezoekverzoeken')
    .select('groep_id, aangevraagd_door, aangevraagd_naam, soort, reactie_door, reactie_naam, reactie_wanneer, ingetrokken_op')
    .eq('id', verzoekId).maybeSingle()
  if (!verzoek || verzoek.ingetrokken_op) return { error: t('algemeen.lukteNiet') }
  const bellen = verzoek.soort === 'bellen'
  const hoofdpersoon = verzoek.aangevraagd_naam || t('algemeen.deHoofdpersoon')

  if (bellen) {
    // Bellen: één persoon is genoeg
    const { data } = await service
      .from('bezoekverzoeken')
      .update({ reactie_door: user.id, reactie_naam: naam, reactie_wanneer: schoon, reactie_op: new Date().toISOString() })
      .eq('id', verzoekId).is('reactie_door', null).is('ingetrokken_op', null)
      .select('id').maybeSingle()
    if (!data) {
      if (verzoek.reactie_door === user.id) return { succes: true, naam }
      return { alGeregeld: true, naam: verzoek.reactie_naam ?? null, wanneer: verzoek.reactie_wanneer ?? null }
    }
  } else {
    // Bezoek: iedereen mag laten weten dat hij langskomt, elk met een eigen moment
    const { error } = await service
      .from('bezoek_reacties')
      .upsert({ verzoek_id: verzoekId, user_id: user.id, naam, wanneer: schoon || null, aangemaakt_op: new Date().toISOString() }, { onConflict: 'verzoek_id,user_id' })
    if (error) return { error: t('algemeen.lukteNiet') }
    // De eerste reactie ook op het verzoek zelf zetten (oudere schermen en meldingen)
    if (!verzoek.reactie_door) {
      await service.from('bezoekverzoeken')
        .update({ reactie_door: user.id, reactie_naam: naam, reactie_wanneer: schoon, reactie_op: new Date().toISOString() })
        .eq('id', verzoekId).is('reactie_door', null)
    }
  }

  // De rest van de familie: zelfde tag, dus dit vervangt het eerdere bericht op hun telefoon.
  const anderen = (await groepsledenBehalve(verzoek.groep_id, user.id)).filter(id => id !== verzoek.aangevraagd_door)
  await stuurMelding(anderen, tt => ({
    titel: bellen
      ? tt('bezoek.belGeregeldTitel', { naam, hoofdpersoon })
      : tt('bezoek.geregeldTitel', { naam, hoofdpersoon }),
    tekst: bellen ? tt('bezoek.geregeldTekst') : schoon ? hoofdletter(wanneerTekst(tt, schoon)) : tt('wanneer.binnenkort'),
    url: `/groep/${verzoek.groep_id}`,
    tag: `bezoek-${verzoekId}`,
  }))

  if (verzoek.aangevraagd_door) {
    await stuurMelding([verzoek.aangevraagd_door], tt => bellen ? {
      titel: tt('bezoek.belKomtTitel', { naam }),
      tekst: tt('bezoek.belKomtTekst'),
      url: `/oudere/${verzoek.groep_id}`,
      tag: `bel-${verzoekId}`,
    } : {
      titel: tt('bezoek.komtLangsTitel', { naam }),
      tekst: schoon ? hoofdletter(wanneerTekst(tt, schoon)) : tt('wanneer.binnenkort'),
      url: `/oudere/${verzoek.groep_id}`,
      tag: `bezoek-${verzoekId}-${user.id}`,
    })
  }

  return { succes: true, naam }
}

/** Een familielid komt toch niet: eigen reactie op een bezoekverzoek weghalen */
export async function trekReactieIn(verzoekId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: true }
  const service = createServiceClient()
  await service.from('bezoek_reacties').delete().eq('verzoek_id', verzoekId).eq('user_id', user.id)
  // Was jij de eerste? Dan de volgende reactie (of niemand) op het verzoek zetten
  const { data: verzoek } = await service.from('bezoekverzoeken').select('reactie_door').eq('id', verzoekId).maybeSingle()
  if (verzoek?.reactie_door === user.id) {
    const { data: volgende } = await service.from('bezoek_reacties')
      .select('user_id, naam, wanneer, aangemaakt_op').eq('verzoek_id', verzoekId)
      .order('aangemaakt_op', { ascending: true }).limit(1).maybeSingle()
    await service.from('bezoekverzoeken').update(volgende
      ? { reactie_door: volgende.user_id, reactie_naam: volgende.naam, reactie_wanneer: volgende.wanneer || '', reactie_op: volgende.aangemaakt_op }
      : { reactie_door: null, reactie_naam: null, reactie_wanneer: null, reactie_op: null }).eq('id', verzoekId)
  }
  return { ok: true }
}

/** Heeft deze persoon net al zo'n verzoek gedaan dat nog open stond (ook als het is ingetrokken)? */
async function vandaagAlGemeld(groepId: string, userId: string, soort: 'bezoek' | 'bellen') {
  // Alleen een verzoek van het afgelopen half uur waar nog niemand op reageerde telt:
  // wie per ongeluk intrekt en opnieuw tikt, stoort niet twee keer. Een echt nieuw verzoek geeft wel een melding.
  const { count } = await createClient()
    .from('bezoekverzoeken')
    .select('id', { count: 'exact', head: true })
    .eq('groep_id', groepId).eq('aangevraagd_door', userId).eq('soort', soort)
    .is('reactie_door', null)
    .gt('aangemaakt_op', new Date(Date.now() - 30 * 60 * 1000).toISOString())
  return (count || 0) > 0
}

/** Verzoek intrekken of afronden (ook als er al iemand reageerde). Het blijft bewaard met een tijdstip, zodat opnieuw vragen niet weer iedereen stoort. */
export async function trekVerzoekIn(verzoekId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: true }
  const { error } = await createServiceClient()
    .from('bezoekverzoeken')
    .update({ ingetrokken_op: new Date().toISOString() })
    .eq('id', verzoekId).eq('aangevraagd_door', user.id)
  return error ? { error: true } : { ok: true }
}
