'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { LETTERGROOTTES } from '@/lib/voorkeuren'
import { getT } from '@/lib/i18n/server'

export async function slaVoorkeurenOp(invoer: { naam: string; lettergrootte: string; geluid: boolean }) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const naam = (invoer.naam || '').trim().slice(0, 60)
  if (!naam) return { error: t('instellingen.vulNaam') }
  if (!LETTERGROOTTES.some(l => l.waarde === invoer.lettergrootte)) {
    return { error: t('instellingen.kiesGrootte') }
  }

  // Alleen je eigen profiel, alleen deze velden
  const { error } = await createServiceClient()
    .from('users')
    .update({ naam, lettergrootte: invoer.lettergrootte, geluid: !!invoer.geluid })
    .eq('id', user.id)

  if (error) return { error: t('instellingen.opslaanMislukt') }

  revalidatePath('/', 'layout')
  return { succes: true }
}
