'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { LETTERGROOTTES } from '@/lib/voorkeuren'

export async function slaVoorkeurenOp(invoer: { naam: string; lettergrootte: string; geluid: boolean }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Je bent niet ingelogd.' }

  const naam = (invoer.naam || '').trim().slice(0, 60)
  if (!naam) return { error: 'Vul een naam in.' }
  if (!LETTERGROOTTES.some(l => l.waarde === invoer.lettergrootte)) {
    return { error: 'Kies een lettergrootte.' }
  }

  // Alleen je eigen profiel, alleen deze velden
  const { error } = await createServiceClient()
    .from('users')
    .update({ naam, lettergrootte: invoer.lettergrootte, geluid: !!invoer.geluid })
    .eq('id', user.id)

  if (error) return { error: 'Opslaan lukte niet. Probeer het nog eens.' }

  revalidatePath('/', 'layout')
  return { succes: true }
}
