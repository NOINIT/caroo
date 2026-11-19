'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isBeheerder } from '@/lib/rechten'
import { getT } from '@/lib/i18n/server'

/**
 * Leg vast dat de hoofdpersoon het goed vindt dat de familie gezondheidsgegevens bijhoudt
 * (medicijnen en de dagelijkse smiley). Mag een beheerder van de groep, of de hoofdpersoon zelf.
 */
export async function geefToestemming(groepId: string) {
  const { t } = await getT()
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const service = createServiceClient()
  const { data: ik } = await service.from('groepsleden').select('rol').eq('groep_id', groepId).eq('user_id', user.id).maybeSingle()
  if (!ik) return { error: t('algemeen.lukteNiet') }
  if (ik.rol !== 'oudere' && !(await isBeheerder(groepId, user.id))) return { error: t('algemeen.lukteNiet') }

  const { error } = await service.from('zorggroepen')
    .update({ toestemming_gezondheid_op: new Date().toISOString(), toestemming_gezondheid_door: user.id })
    .eq('id', groepId)
  if (error) return { error: t('algemeen.lukteNiet') }
  revalidatePath(`/groep/${groepId}`)
  revalidatePath(`/oudere/${groepId}`)
  return { ok: true }
}


/**
 * Trek de toestemming voor gezondheidsgegevens in. Mag de hoofdpersoon zelf of een beheerder.
 * De smileys en medicijnen van deze groep worden gewist; de rest van Clanoo blijft werken.
 */
export async function trekToestemmingIn(groepId: string) {
  const { t } = await getT()
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const service = createServiceClient()
  const { data: ik } = await service.from('groepsleden').select('rol').eq('groep_id', groepId).eq('user_id', user.id).maybeSingle()
  if (!ik) return { error: t('algemeen.lukteNiet') }
  if (ik.rol !== 'oudere' && !(await isBeheerder(groepId, user.id))) return { error: t('algemeen.lukteNiet') }

  const [a, b] = await Promise.all([
    service.from('stemmingen').delete().eq('groep_id', groepId),
    service.from('medicijnen').delete().eq('groep_id', groepId),
  ])
  if (a.error || b.error) return { error: t('algemeen.lukteNiet') }
  const { error } = await service.from('zorggroepen')
    .update({ toestemming_gezondheid_op: null, toestemming_gezondheid_door: null })
    .eq('id', groepId)
  if (error) return { error: t('algemeen.lukteNiet') }
  revalidatePath(`/groep/${groepId}`)
  revalidatePath(`/oudere/${groepId}`)
  return { ok: true }
}
