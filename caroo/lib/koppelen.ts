import 'server-only'
import crypto from 'crypto'
import QRCode from 'qrcode'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stuurMelding } from '@/lib/meldingen'

/** Hoe lang een QR-code werkt */
export const KOPPEL_MINUTEN = 15

/** Hoofdpersonen zonder e-mailadres krijgen een adres op dit domein. Er gaat nooit mail naartoe. */
export const GEEN_EMAIL_DOMEIN = 'geen-email.clanoo.nl'
export function isGeenEmail(email: string | null | undefined) {
  return !!email && email.toLowerCase().endsWith('@' + GEEN_EMAIL_DOMEIN)
}

const hash = (code: string) => crypto.createHash('sha256').update(code).digest('hex')

/** Mag deze ingelogde gebruiker een tablet koppelen in deze groep? (beheerder of mantelzorger) */
export async function magKoppelen(groepId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await createServiceClient()
    .from('groepsleden')
    .select('rol')
    .eq('groep_id', groepId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data || (data.rol !== 'groepsbeheerder' && data.rol !== 'mantelzorger')) return null
  return user
}

/**
 * Mag deze gebruiker een tablet koppelen of afmelden? Alleen een beheerder: met een koppelcode
 * log je in als de hoofdpersoon, en dat mag niet iedereen in de familie.
 */
export async function magKoppelenBeheerder(groepId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await createServiceClient()
    .from('groepsleden').select('rol, beheerder').eq('groep_id', groepId).eq('user_id', user.id).maybeSingle()
  if (!data || !(data.rol === 'groepsbeheerder' || data.beheerder)) return null
  return user
}

/** Logt deze hoofdpersoon zelf in (eigen account, beheert zelf)? Dan geen koppelcode: dat zou inloggen als haar zijn. */
export async function logtZelfIn(groepId: string, hoofdpersoonId: string) {
  const service = createServiceClient()
  const [{ data: lid }, { data: groep }] = await Promise.all([
    service.from('groepsleden').select('beheerder').eq('groep_id', groepId).eq('user_id', hoofdpersoonId).maybeSingle(),
    service.from('zorggroepen').select('eigenaar_id').eq('id', groepId).maybeSingle(),
  ])
  return !!lid?.beheerder || groep?.eigenaar_id === hoofdpersoonId
}

/** Maak een eenmalige code voor de tablet van een hoofdpersoon in deze groep */
export async function maakKoppelcode(groepId: string, hoofdpersoonId: string, doorId: string) {
  const service = createServiceClient()
  const { data: lid } = await service
    .from('groepsleden')
    .select('rol')
    .eq('groep_id', groepId)
    .eq('user_id', hoofdpersoonId)
    .maybeSingle()
  if (lid?.rol !== 'oudere') return null
  if (await logtZelfIn(groepId, hoofdpersoonId)) return null

  // Oude, nog niet gebruikte codes voor deze persoon laten vervallen
  await service.from('koppelcodes').delete().eq('user_id', hoofdpersoonId).is('gebruikt_op', null)

  const code = crypto.randomBytes(24).toString('base64url')
  const verloopt = new Date(Date.now() + KOPPEL_MINUTEN * 60000)
  const { error } = await service.from('koppelcodes').insert({
    code_hash: hash(code),
    groep_id: groepId,
    user_id: hoofdpersoonId,
    aangemaakt_door: doorId,
    verloopt_op: verloopt.toISOString(),
  })
  if (error) return null

  const basis = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'
  const url = `${basis}/koppel/${code}`
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1A2F5A', light: '#FFFFFF' } })
  return { url, qr, verloopt: verloopt.toISOString() }
}

/** Zoek een geldige code op, zonder hem te gebruiken (voor de welkomstpagina) */
export async function bekijkKoppelcode(code: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(code)) return null
  const service = createServiceClient()
  const { data } = await service
    .from('koppelcodes')
    .select('id, groep_id, user_id, verloopt_op, gebruikt_op, users:user_id (naam, email)')
    .eq('code_hash', hash(code))
    .maybeSingle()
  if (!data || data.gebruikt_op || new Date(data.verloopt_op) < new Date()) return null
  const u = data.users as unknown as { naam: string; email: string } | null
  if (!u) return null
  return { id: data.id, groepId: data.groep_id, userId: data.user_id, naam: u.naam, email: u.email }
}

/**
 * Gebruik de code: log deze browser in als de hoofdpersoon.
 * De code werkt één keer. De sessie blijft daarna bewaard op dit apparaat.
 */
export async function gebruikKoppelcode(code: string): Promise<{ groepId: string } | null> {
  const gevonden = await bekijkKoppelcode(code)
  if (!gevonden) return null
  const service = createServiceClient()

  // Eerst als gebruikt markeren, zodat dezelfde code nooit twee keer werkt
  const { data: gemarkeerd } = await service
    .from('koppelcodes')
    .update({ gebruikt_op: new Date().toISOString() })
    .eq('id', gevonden.id)
    .is('gebruikt_op', null)
    .select('id')
    .maybeSingle()
  if (!gemarkeerd) return null

  const { data: link, error } = await service.auth.admin.generateLink({ type: 'magiclink', email: gevonden.email })
  const tokenHash = link?.properties?.hashed_token
  if (error || !tokenHash) return null

  const supabase = createClient()
  await supabase.auth.signOut().catch(() => {})
  const { error: fout } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  if (fout) return null

  // De beheerders horen dat er een toestel is gekoppeld. Klopt dat niet, dan melden ze het af.
  const { data: beheerders } = await service.from('groepsleden').select('user_id, rol, beheerder').eq('groep_id', gevonden.groepId)
  const naar = (beheerders || []).filter(b => (b.rol === 'groepsbeheerder' || b.beheerder) && b.user_id !== gevonden.userId).map(b => b.user_id as string)
  await stuurMelding(naar, tt => ({
    titel: tt('koppelen.gekoppeldTitel', { naam: gevonden.naam.split(' ')[0] }),
    tekst: tt('koppelen.gekoppeldTekst'),
    url: `/groep/${gevonden.groepId}/koppelen`,
    tag: `koppel-${gevonden.id}`,
  })).catch(() => {})
  return { groepId: gevonden.groepId }
}

/**
 * Voeg een hoofdpersoon direct toe aan de groep, zonder uitnodiging per mail.
 * Zonder e-mailadres krijgt de hoofdpersoon een intern adres; inloggen gaat dan alleen via de QR-code.
 */
export async function voegHoofdpersoonToe(groepId: string, naam: string, email: string | null, taal: string) {
  const service = createServiceClient()
  const schoneNaam = naam.trim().slice(0, 60)
  const adres = email
    ? email.trim().toLowerCase()
    : `hoofdpersoon-${crypto.randomBytes(8).toString('hex')}@${GEEN_EMAIL_DOMEIN}`

  // Bestaat dit adres al, dan niet zomaar iemand aan een groep toevoegen: dan via een uitnodiging
  const { data: bestaand } = await service.from('users').select('id').ilike('email', adres).maybeSingle()
  if (bestaand) return { error: 'bestaat' as const }

  const { data: aangemaakt, error } = await service.auth.admin.createUser({
    email: adres,
    email_confirm: true,
    user_metadata: { naam: schoneNaam, taal },
  })
  if (error || !aangemaakt.user) return { error: error && /already|registered|exists/i.test(error.message) ? 'bestaat' as const : 'mislukt' as const }

  const userId = aangemaakt.user.id
  const { error: profielFout } = await service.from('users').insert({ id: userId, email: adres, naam: schoneNaam, rol: 'oudere', taal })
  if (profielFout) {
    await service.auth.admin.deleteUser(userId).catch(() => {})
    return { error: 'mislukt' as const }
  }
  const { error: lidFout } = await service.from('groepsleden').insert({ groep_id: groepId, user_id: userId, rol: 'oudere' })
  if (lidFout) return { error: 'mislukt' as const }
  return { userId }
}

/** Meld de tablet (en elk ander toestel) van een hoofdpersoon in deze groep af. Binnen een uur is het toestel uitgelogd. */
export async function meldTabletAf(groepId: string, hoofdpersoonId: string) {
  const service = createServiceClient()
  const { data: lid } = await service
    .from('groepsleden')
    .select('rol')
    .eq('groep_id', groepId)
    .eq('user_id', hoofdpersoonId)
    .maybeSingle()
  if (lid?.rol !== 'oudere') return false
  await service.from('koppelcodes').delete().eq('user_id', hoofdpersoonId).is('gebruikt_op', null)
  const { error } = await service.rpc('meld_tablet_af', { p_user: hoofdpersoonId })
  if (error) { console.error('Tablet afmelden mislukt', error); return false }
  return true
}
