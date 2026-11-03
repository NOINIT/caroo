'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isBeheerder } from '@/lib/rechten'
import { getT } from '@/lib/i18n/server'

/**
 * Maak iemand beheerder, of niet meer.
 * Elke beheerder mag dit. De eigenaar (die betaalt) blijft altijd beheerder, en jezelf
 * pas je hier niet aan, zodat er altijd minstens één beheerder overblijft.
 */
export async function zetBeheerder(groepId: string, lidId: string, aan: boolean) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  if (!(await isBeheerder(groepId, user.id))) return { error: t('beheer.alleenBeheerder') }

  const service = createServiceClient()
  const [{ data: lid }, { data: groep }] = await Promise.all([
    service.from('groepsleden').select('id, user_id, groep_id, rol').eq('id', lidId).single(),
    service.from('zorggroepen').select('eigenaar_id').eq('id', groepId).single(),
  ])
  if (!lid || lid.groep_id !== groepId) return { error: t('beheer.nietInGroep') }
  if (lid.user_id === user.id) return { error: t('beheer.nietJezelf') }
  if (lid.user_id === groep?.eigenaar_id) return { error: t('beheer.nietEigenaar') }

  const wijziging = lid.rol === 'oudere'
    ? { beheerder: aan }
    : { rol: aan ? 'groepsbeheerder' : 'mantelzorger', beheerder: aan }
  const { error } = await service.from('groepsleden').update(wijziging).eq('id', lidId)
  if (error) return { error: t('algemeen.lukteNiet') }
  return { succes: true }
}
