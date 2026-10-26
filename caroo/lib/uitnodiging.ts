import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Rol } from '@/types/database'
import crypto from 'crypto'
import { getT } from '@/lib/i18n/server'

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

  const { t } = await getT()
  const magNogUitnodigen = await checkRateLimit(uitgenodigdDoor)
  if (!magNogUitnodigen) {
    return { error: t('uitnodigingFout.maxPerDag', { aantal: MAX_UITNODIGINGEN_PER_DAG }) }
  }

  // Staat er al een open uitnodiging voor dit adres in deze groep?
  // Dan laten we die vervallen: alleen de nieuwste link werkt nog.
  // (Rechten van de uitnodiger zijn al gecontroleerd in de API-route.)
  await createServiceClient()
    .from('uitnodigingen')
    .update({ verloopt_op: new Date().toISOString() })
    .eq('groep_id', groepId)
    .ilike('email', email)
    .eq('gebruikt', false)
    .gt('verloopt_op', new Date().toISOString())

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
    return { error: t('uitnodigingFout.nietAangemaakt') }
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

  const { t } = await getT()
  if (error || !data) {
    return { error: t('uitnodigingFout.nietGevonden') }
  }

  if (data.gebruikt) {
    return { error: t('uitnodigingFout.alGebruikt') }
  }

  if (new Date(data.verloopt_op) < new Date()) {
    return { error: t('uitnodigingFout.verlopen') }
  }

  return { uitnodiging: data }
}

/**
 * Voeg een gebruiker toe aan de groep van een uitnodiging.
 * Is de gebruiker al lid, dan blijft de uitnodiging open: hij was dan
 * kennelijk voor iemand anders bedoeld (bijv. link geopend terwijl de
 * beheerder zelf nog ingelogd was).
 * Service client: de token is al gecontroleerd, RLS mag dit niet blokkeren.
 */
async function voegToeAanGroep(
  uitnodiging: { id: string; groep_id: string; rol: string },
  userId: string
): Promise<'nieuw' | 'al_lid' | 'fout'> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('groepsleden').insert({
    groep_id: uitnodiging.groep_id,
    user_id: userId,
    rol: uitnodiging.rol,
  })

  // 23505 = al lid van deze groep
  if (error?.code === '23505') return 'al_lid'
  if (error) return 'fout'

  await supabase
    .from('uitnodigingen')
    .update({ gebruikt: true })
    .eq('id', uitnodiging.id)

  return 'nieuw'
}

type AcceptatieResultaat =
  | { error: string }
  | { succes: true; groepId: string; rol: string; alLid: boolean }

export async function accepteerUitnodiging(
  token: string,
  userId: string
): Promise<AcceptatieResultaat> {
  const supabase = createServiceClient()

  const { data: uitnodiging } = await supabase
    .from('uitnodigingen')
    .select('id, groep_id, rol, gebruikt, verloopt_op')
    .eq('token', token)
    .single()

  const { t } = await getT()
  if (!uitnodiging) return { error: t('uitnodigingFout.nietGevonden') }

  // Al gebruikt? Als deze gebruiker al lid is, is dat gewoon goed.
  if (uitnodiging.gebruikt) {
    const { data: lid } = await supabase
      .from('groepsleden')
      .select('groep_id')
      .eq('groep_id', uitnodiging.groep_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (lid) return { succes: true, groepId: uitnodiging.groep_id, rol: uitnodiging.rol, alLid: true }
    return { error: t('uitnodigingFout.alGebruikt') }
  }

  if (new Date(uitnodiging.verloopt_op) < new Date()) {
    return { error: t('uitnodigingFout.verlopen') }
  }

  const uitkomst = await voegToeAanGroep(uitnodiging, userId)
  if (uitkomst === 'fout') return { error: t('uitnodigingFout.nietVerwerkt') }

  return {
    succes: true,
    groepId: uitnodiging.groep_id,
    rol: uitnodiging.rol,
    alLid: uitkomst === 'al_lid',
  }
}

/**
 * Verwerk alle openstaande uitnodigingen voor een ingelogde gebruiker.
 * Kijkt naar (1) de token die bij registratie in het account is opgeslagen
 * en (2) open uitnodigingen op het (bevestigde) e-mailadres van de gebruiker.
 * Werkt dus ongeacht via welke pagina of browser iemand binnenkomt.
 * Geeft de groep-id terug van de eerste nieuw geaccepteerde uitnodiging.
 */
export async function verwerkOpenUitnodigingen(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, any>
}): Promise<string | null> {
  const supabase = createServiceClient()
  let eersteGroep: string | null = null

  const token = user.user_metadata?.uitnodiging_token as string | undefined
  if (token) {
    const resultaat = await accepteerUitnodiging(token, user.id)
    if ('groepId' in resultaat && !resultaat.alLid) eersteGroep = resultaat.groepId

    // Token opruimen zodat dit maar één keer gebeurt
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, uitnodiging_token: null },
    })
  }

  if (user.email) {
    const { data: open } = await supabase
      .from('uitnodigingen')
      .select('id, groep_id, rol')
      .ilike('email', user.email)
      .eq('gebruikt', false)
      .gt('verloopt_op', new Date().toISOString())

    for (const uitnodiging of open || []) {
      const uitkomst = await voegToeAanGroep(uitnodiging, user.id)
      if (uitkomst === 'nieuw' && !eersteGroep) eersteGroep = uitnodiging.groep_id
    }
  }

  return eersteGroep
}
