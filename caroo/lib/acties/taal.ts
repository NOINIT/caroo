'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isTaal, TAAL_COOKIE } from '@/lib/i18n/talen'

/** Kies een taal. Werkt ook zonder account (dan alleen een cookie op dit toestel). */
export async function kiesTaal(taal: string) {
  if (!isTaal(taal)) return { error: 'Onbekende taal' }

  cookies().set(TAAL_COOKIE, taal, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // Alleen je eigen profiel, alleen dit veld
    await createServiceClient().from('users').update({ taal }).eq('id', user.id)
  }

  revalidatePath('/', 'layout')
  return { succes: true }
}
