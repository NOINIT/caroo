import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Rol } from '@/types/database'
import crypto from 'crypto'

export const MAX_UITNODIGINGEN_PER_DAG = 10
export const UITNODIGING_VERVALT_DAGEN = 7

export async function checkRateLimit(userId: string): Promise<boolean> {
  const supabase = createClient()
  const vandaag = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('uitnodiging_log')
    .select('aantal')
    .eq('user_id', userId)
    .eq('datum', vandaag)
    .single()

  return !data || data.aantal < MAX_UITNODIGINGEN_PER_DAG
}

async function verhoogTeller(userId: string): Promise<void> {
  const supabase = createClient()
  const vandaag = new Date().toISOString().split('T')[0]

  await supabase.from('uitnodiging_log').upsert(
    { user_id: userId, datum: vandaag, aantal: 1 },
    {
      onConflict: 'user_id,datum',
      ignoreDuplicates: false,
    }
  )

  await supabase.rpc('increment_uitnodiging_teller', {
    p_user_id: userId,
    p_datum: vandaag,
  })
}

export async function maakUitnodiging(params: {
  groepId: string
  uitgenodigdDoor: string
  email: string
  rol: Rol
}): Promise<{ token: string; uitnodiging: any } | { error: string }> {
  const { groepId, uitgenodigdDoor, email, rol } = params
  const supabase = createClient()

  const magNogUitnodigen = await checkRateLimit(uitgenodigdDoor)
  if (!magNogUitnodigen) {
    return { error: `Je kunt maximaal ${MAX_UITNODIGINGEN_PER_DAG} uitnodigingen per dag versturen.` }
  }

  const { data: bestaand } = await supabase
    .from('uitnodigingen')
    .select('id, gebruikt')
    .eq('groep_id', groepId)
    .eq('email', email)
    .eq('gebruikt', false)
    .gt('verloopt_op', new Date().toISOString())
    .single()

  if (bestaand) {
    return { error: 'Dit e-mailadres heeft al een openstaande uitnodiging.' }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const verlooptOp = new Date()
  verlooptOp.setDate(verlooptOp.getDate() + UITNODIGING_VERVALT_DAGEN)

  const { data: uitnodiging, error } = await supabase.from('uitnodigingen').insert({
    groep_id: groepId,
    uitgenodigd_door: uitgenodigdDoor,
    email,
    rol,
    token,
    verloopt_op: verlooptOp.toISOString(),
  }).select('id, email, rol, gebruikt, verloopt_op, aangemaakt_op').single()

  if (error) {
    return { error: 'Kon uitnodiging niet aanmaken.' }
  }

  await verhoogTeller(uitgenodigdDoor)

  return { token, uitnodiging }
}

export async function valideerToken(token: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('uitnodigingen')
    .select(`
      id,
      groep_id,
      email,
      rol,
      gebruikt,
      verloopt_op,
      zorggroepen (naam)
    `)
    .eq('token', token)
    .single()

  if (error || !data) {
    return { error: 'Uitnodiging niet gevonden.' }
  }

  if (data.gebruikt) {
    return { error: 'Deze uitnodiging is al gebruikt.' }
  }

  if (new Date(data.verloopt_op) < new Date()) {
    return { error: 'Deze uitnodiging is verlopen.' }
  }

  return { uitnodiging: data }
}

export async function accepteerUitnodiging(token: string, userId: string) {
  const supabase = createClient()

  const validatie = await valideerToken(token)
  if ('error' in validatie) return validatie

  const { uitnodiging } = validatie

  const { error: lidError } = await supabase.from('groepsleden').insert({
    groep_id: uitnodiging.groep_id,
    user_id: userId,
    rol: uitnodiging.rol,
  })

  if (lidError) {
    if (lidError.code === '23505') {
      return { error: 'Je bent al lid van deze zorggroep.' }
    }
    return { error: 'Kon uitnodiging niet verwerken.' }
  }

  await supabase
    .from('uitnodigingen')
    .update({ gebruikt: true })
    .eq('token', token)

  return { succes: true, groepId: uitnodiging.groep_id, rol: uitnodiging.rol }
}
