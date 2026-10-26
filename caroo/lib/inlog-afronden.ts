import { createServiceClient } from '@/lib/supabase/server'
import { verwerkOpenUitnodigingen } from '@/lib/uitnodiging'
import type { User } from '@supabase/supabase-js'
import { isTaal } from '@/lib/i18n/talen'

/**
 * Alles wat moet gebeuren direct nadat iemand is ingelogd via een maillink:
 * profiel aanmaken als dat nog niet bestaat en openstaande uitnodigingen
 * verwerken. Geeft het pad terug waar de gebruiker heen moet.
 */
export async function rondInlogAf(user: User, next: string): Promise<string> {
  const service = createServiceClient()

  const { data: bestaand } = await service
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!bestaand) {
    const naam = user.user_metadata?.naam || user.email?.split('@')[0] || 'Nieuw lid'
    await service.from('users').insert({
      id: user.id,
      email: user.email!,
      naam,
      rol: 'mantelzorger',
      // Taal die iemand koos bij registreren of op de uitnodiging
      ...(isTaal(user.user_metadata?.taal) ? { taal: user.user_metadata.taal } : {}),
    })
  }

  const groepId = await verwerkOpenUitnodigingen(user)
  // De groepspagina stuurt een hoofdpersoon zelf door naar de eigen weergave
  if (groepId) return `/groep/${groepId}?welkom=true`

  if (next.startsWith('/uitnodiging')) return '/dashboard?uitnodiging=ongeldig'
  return next
}

/** Alleen interne paden toestaan als bestemming */
export function veiligPad(next: string | null | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}
