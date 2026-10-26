import 'server-only'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isTaal, STANDAARD_TAAL, TAAL_COOKIE, type Taal } from './talen'
import { maakT } from './vertaal'

/**
 * Taal van de huidige bezoeker:
 * 1. ingelogd: de taal uit het eigen profiel
 * 2. anders: de gekozen taal (cookie)
 * 3. anders: de taal van de browser, als we die aanbieden
 */
export async function getTaal(): Promise<Taal> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('users').select('taal').eq('id', user.id).maybeSingle()
      if (isTaal(data?.taal)) return data.taal
    }
  } catch {}

  const cookie = cookies().get(TAAL_COOKIE)?.value
  if (isTaal(cookie)) return cookie

  const browser = headers().get('accept-language') || ''
  for (const deel of browser.split(',')) {
    const code = deel.trim().slice(0, 2).toLowerCase()
    if (isTaal(code)) return code
  }
  return STANDAARD_TAAL
}

export async function getT() {
  const taal = await getTaal()
  return { taal, t: maakT(taal) }
}

/** Taal van een andere gebruiker (voor mails en meldingen) */
export async function taalVanGebruikers(service: any, userIds: string[]): Promise<Record<string, Taal>> {
  const { data } = await service.from('users').select('id, taal').in('id', userIds)
  const uit: Record<string, Taal> = {}
  for (const r of data || []) uit[r.id] = isTaal(r.taal) ? r.taal : STANDAARD_TAAL
  return uit
}
