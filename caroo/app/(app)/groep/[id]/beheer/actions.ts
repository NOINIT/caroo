'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'

/**
 * Verwijder een lid uit een groep.
 * Alleen een groepsbeheerder mag dit, en de eigenaar van de groep
 * (degene die betaalt) en jezelf kun je niet verwijderen.
 */
export async function verwijderLidUitGroep(groepId: string, lidId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Je bent niet ingelogd.' }

  const magBeheren = await heeftRecht(groepId, ['groepsbeheerder'])
  if (!magBeheren) return { error: 'Alleen een beheerder kan leden verwijderen.' }

  const service = createServiceClient()
  const [{ data: lid }, { data: groep }] = await Promise.all([
    service.from('groepsleden').select('id, user_id, groep_id').eq('id', lidId).single(),
    service.from('zorggroepen').select('eigenaar_id').eq('id', groepId).single(),
  ])

  if (!lid || lid.groep_id !== groepId) return { error: 'Dit lid hoort niet bij deze groep.' }
  if (lid.user_id === user.id) return { error: 'Je kunt jezelf niet verwijderen.' }
  if (lid.user_id === groep?.eigenaar_id) return { error: 'De eigenaar van de groep kan niet verwijderd worden.' }

  const { error } = await service.from('groepsleden').delete().eq('id', lidId)
  if (error) return { error: 'Verwijderen lukte niet. Probeer het nog eens.' }

  return { succes: true }
}
