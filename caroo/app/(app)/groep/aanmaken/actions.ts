'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'

/**
 * Maak een groep aan. Wie hem aanmaakt, wordt eigenaar en beheerder.
 * Voor mezelf: je bent de hoofdpersoon (eenvoudig scherm) en beheert zelf.
 * Voor iemand anders: je bent familie-beheerder en voegt de hoofdpersoon later toe.
 */
export async function maakGroep(naam: string, voorMezelf: boolean) {
  const { t } = await getT()
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const schoon = (naam || '').trim().slice(0, 60)
  if (!schoon) return { error: t('aanmaken.mislukt') }

  const service = createServiceClient()
  const { data: groep, error } = await service.from('zorggroepen')
    .insert({ naam: schoon, eigenaar_id: user.id }).select('id').single()
  if (error || !groep) return { error: t('aanmaken.mislukt') }

  const { error: lidFout } = await service.from('groepsleden').insert({
    groep_id: groep.id, user_id: user.id,
    rol: voorMezelf ? 'oudere' : 'groepsbeheerder', beheerder: true,
  })
  if (lidFout) {
    await service.from('zorggroepen').delete().eq('id', groep.id)
    return { error: t('aanmaken.mislukt') }
  }
  return { id: groep.id as string }
}
