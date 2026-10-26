'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { getT } from '@/lib/i18n/server'

/**
 * Verwijder een lid uit een groep.
 * Alleen een groepsbeheerder mag dit, en de eigenaar van de groep
 * (degene die betaalt) en jezelf kun je niet verwijderen.
 */
export async function verwijderLidUitGroep(groepId: string, lidId: string) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const magBeheren = await heeftRecht(groepId, ['groepsbeheerder'])
  if (!magBeheren) return { error: t('beheer.alleenBeheerder') }

  const service = createServiceClient()
  const [{ data: lid }, { data: groep }] = await Promise.all([
    service.from('groepsleden').select('id, user_id, groep_id').eq('id', lidId).single(),
    service.from('zorggroepen').select('eigenaar_id').eq('id', groepId).single(),
  ])

  if (!lid || lid.groep_id !== groepId) return { error: t('beheer.nietInGroep') }
  if (lid.user_id === user.id) return { error: t('beheer.nietJezelf') }
  if (lid.user_id === groep?.eigenaar_id) return { error: t('beheer.nietEigenaar') }

  const { error } = await service.from('groepsleden').delete().eq('id', lidId)
  if (error) return { error: t('fotos.verwijderenMislukt') }

  return { succes: true }
}
