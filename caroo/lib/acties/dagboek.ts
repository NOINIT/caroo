'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stuurMelding } from '@/lib/meldingen'

/**
 * Een dringende aantekening in het dagboek: de familie krijgt meteen een melding.
 * Niet naar de schrijver, niet naar de hoofdpersoon, en niet naar wie het dagboek niet mag zien.
 */
export async function meldDringend(entryId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: true }
  // Met eigen rechten: bestaat de aantekening, is hij van jou en dringend?
  const { data: entry } = await supabase.from('dagboek').select('id, groep_id, auteur_id, dringend').eq('id', entryId).maybeSingle()
  if (!entry || entry.auteur_id !== user.id || !entry.dringend) return { error: true }

  const { data: leden } = await createServiceClient()
    .from('groepsleden').select('user_id, rol, beheerder, verborgen').eq('groep_id', entry.groep_id)
  const ontvangers = (leden || [])
    .filter(l => l.user_id !== user.id && l.rol !== 'oudere')
    .filter(l => l.beheerder || l.rol === 'groepsbeheerder' || !(l.verborgen || []).includes('dagboek'))
    .map(l => l.user_id as string)

  await stuurMelding(ontvangers, tt => ({
    titel: tt('dagboek.dringendMeldingTitel'),
    tekst: tt('dagboek.dringendMeldingTekst'),
    url: `/groep/${entry.groep_id}`,
    tag: `dringend-${entry.id}`,
  }))
  return { ok: true }
}
