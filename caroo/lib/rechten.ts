import { createClient } from '@/lib/supabase/server'
import type { Rol } from '@/types/database'

/**
 * Controleer of de ingelogde gebruiker een bepaalde rol heeft in een zorggroep
 */
export async function heeftRecht(groepId: string, toegestaneRollen: Rol[]): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data } = await supabase
    .from('groepsleden')
    .select('rol')
    .eq('groep_id', groepId)
    .eq('user_id', user.id)
    .single()

  if (!data) return false

  return toegestaneRollen.includes(data.rol as Rol)
}

/**
 * Haal de actieve zorggroep(en) op voor de ingelogde gebruiker
 */
export async function getMijnGroepen() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('groepsleden')
    .select(`
      rol,
      zorggroepen (
        id,
        naam,
        betaald,
        eigenaar_id,
        aangemaakt_op,
        gestopt_op
      )
    `)
    .eq('user_id', user.id)

  return data || []
}

/**
 * Controleer of een groep betaald is
 */
export async function isGroepBetaald(groepId: string): Promise<boolean> {
  const supabase = createClient()

  const { data } = await supabase
    .from('zorggroepen')
    .select('betaald')
    .eq('id', groepId)
    .single()

  return data?.betaald ?? false
}

/**
 * Is de ingelogde gebruiker beheerder van deze groep?
 * Dat is een familielid met rol 'groepsbeheerder', of een hoofdpersoon die zelf beheert.
 */
export async function isBeheerder(groepId: string, userId?: string): Promise<boolean> {
  const supabase = createClient()
  let id = userId
  if (!id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    id = user.id
  }
  const { data } = await supabase
    .from('groepsleden')
    .select('rol, beheerder')
    .eq('groep_id', groepId)
    .eq('user_id', id)
    .maybeSingle()
  return !!data && (data.rol === 'groepsbeheerder' || !!data.beheerder)
}
