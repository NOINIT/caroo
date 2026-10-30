import 'server-only'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { vandaagNL } from '@/lib/stemming'

/** Zo veel bekenden mag een hoofdpersoon hebben. Houdt het scherm rustig. */
export const MAX_VRIENDEN = 3
/** Hoe lang een uitnodiging voor een andere familie werkt */
export const VRIEND_UITNODIGING_DAGEN = 7

export type Vervoer = 'zelf' | 'nodig' | 'verschilt'
export type Kant = 'a' | 'b'
export const VERVOER: Vervoer[] = ['zelf', 'nodig', 'verschilt']
export const isVervoer = (v: unknown): v is Vervoer => typeof v === 'string' && (VERVOER as string[]).includes(v)

export const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex')
export const nieuweCode = () => crypto.randomBytes(24).toString('base64url')

export interface Vriendschap {
  id: string
  persoon_a: string
  groep_a: string
  vervoer_a: Vervoer
  persoon_b: string | null
  groep_b: string | null
  vervoer_b: Vervoer | null
  status: 'uitgenodigd' | 'bevestigen' | 'actief'
  verloopt_op: string | null
}

export function kantVan(v: Vriendschap, userId: string): Kant | null {
  if (v.persoon_a === userId) return 'a'
  if (v.persoon_b === userId) return 'b'
  return null
}
export const ander = (k: Kant): Kant => (k === 'a' ? 'b' : 'a')
export const persoonVan = (v: Vriendschap, k: Kant) => (k === 'a' ? v.persoon_a : v.persoon_b) as string
export const groepVan = (v: Vriendschap, k: Kant) => (k === 'a' ? v.groep_a : v.groep_b) as string
export const vervoerVan = (v: Vriendschap, k: Kant) => ((k === 'a' ? v.vervoer_a : v.vervoer_b) || 'verschilt') as Vervoer

const VELDEN = 'id, persoon_a, groep_a, vervoer_a, persoon_b, groep_b, vervoer_b, status, verloopt_op'

/** Een actieve vriendschap waar deze gebruiker een van de twee hoofdpersonen in is */
export async function vriendschapVan(vriendschapId: string, userId: string) {
  const { data } = await createServiceClient()
    .from('vriendschappen').select(VELDEN).eq('id', vriendschapId).eq('status', 'actief').maybeSingle()
  if (!data) return null
  const v = data as Vriendschap
  const kant = kantVan(v, userId)
  return kant ? { v, kant } : null
}

/** Hoeveel bekenden (of open uitnodigingen) heeft deze hoofdpersoon? */
export async function aantalVrienden(persoonId: string) {
  const service = createServiceClient()
  const nu = new Date().toISOString()
  const [{ count: actief }, { count: open }] = await Promise.all([
    service.from('vriendschappen').select('id', { count: 'exact', head: true })
      .in('status', ['actief', 'bevestigen']).or(`persoon_a.eq.${persoonId},persoon_b.eq.${persoonId}`),
    service.from('vriendschappen').select('id', { count: 'exact', head: true })
      .eq('status', 'uitgenodigd').eq('persoon_a', persoonId).gt('verloopt_op', nu),
  ])
  return (actief ?? 0) + (open ?? 0)
}

/** Is deze gebruiker hoofdpersoon in deze groep? */
export async function isHoofdpersoonIn(groepId: string, userId: string) {
  const { data } = await createServiceClient()
    .from('groepsleden').select('rol').eq('groep_id', groepId).eq('user_id', userId).maybeSingle()
  return data?.rol === 'oudere'
}

async function namen(ids: string[]) {
  const schoon = Array.from(new Set(ids.filter(Boolean)))
  if (!schoon.length) return new Map<string, string>()
  const { data } = await createServiceClient().from('users').select('id, naam').in('id', schoon)
  return new Map((data || []).map(u => [u.id as string, (u.naam as string) || '']))
}

/** Lijst voor de tablet: met wie ben ik gekoppeld en is er iets nieuws? */
export async function vriendenOverzicht(userId: string) {
  const service = createServiceClient()
  const { data } = await service.from('vriendschappen').select(VELDEN)
    .eq('status', 'actief').or(`persoon_a.eq.${userId},persoon_b.eq.${userId}`)
    .order('actief_sinds', { ascending: true })
  const lijst = (data || []) as Vriendschap[]
  if (!lijst.length) return []
  const ids = lijst.map(v => v.id)
  const anderen = lijst.map(v => persoonVan(v, ander(kantVan(v, userId)!)))
  const [naamVan, { data: ongelezen }, { data: spellen }, { data: vragen }] = await Promise.all([
    namen(anderen),
    service.from('vriend_berichten').select('vriendschap_id').in('vriendschap_id', ids).neq('van', userId).is('gelezen_op', null),
    service.from('vriend_spellen').select('vriendschap_id, beurt').in('vriendschap_id', ids),
    service.from('vriend_afspraken').select('vriendschap_id, voorgesteld_door').in('vriendschap_id', ids)
      .eq('status', 'gevraagd').gte('dag', vandaagNL()),
  ])
  return lijst.map((v, i) => ({
    id: v.id,
    naam: naamVan.get(anderen[i]) || '',
    ongelezen: (ongelezen || []).filter(b => b.vriendschap_id === v.id).length,
    jouwBeurt: (spellen || []).some(s => s.vriendschap_id === v.id && s.beurt === userId),
    vraag: (vragen || []).some(a => a.vriendschap_id === v.id && a.voorgesteld_door !== userId),
  }))
}
export type VriendKaart = Awaited<ReturnType<typeof vriendenOverzicht>>[number]

/**
 * Alles wat nog loopt voor de tablet: vragen waar ik ja of nee op moet zeggen,
 * vrienden waar ik op wacht, en mijn vragen aan de familie.
 */
export async function vriendenStatus(userId: string, groepId: string) {
  const service = createServiceClient()
  const sinds = new Date(Date.now() - 30 * 86400000).toISOString()
  const [{ data: lopend }, { data: verzoeken }, { data: lid }] = await Promise.all([
    service.from('vriendschappen').select('id, persoon_a, persoon_b, ja_a, ja_b')
      .eq('status', 'bevestigen').or(`persoon_a.eq.${userId},persoon_b.eq.${userId}`),
    service.from('vriend_verzoeken').select('id, vriend_naam, regelt_naam')
      .eq('hoofdpersoon', userId).gt('aangemaakt_op', sinds).order('aangemaakt_op', { ascending: true }),
    service.from('groepsleden').select('vrienden_zelf').eq('groep_id', groepId).eq('user_id', userId).maybeSingle(),
  ])
  const lijst = lopend || []
  const naamVan = await namen(lijst.map(v => (v.persoon_a === userId ? v.persoon_b : v.persoon_a) as string))
  const vanAnder = (v: any) => naamVan.get(v.persoon_a === userId ? v.persoon_b : v.persoon_a) || ''
  const mijnJa = (v: any) => (v.persoon_a === userId ? v.ja_a : v.ja_b)
  return {
    zelf: !!(lid as any)?.vrienden_zelf,
    vragen: lijst.filter(v => !mijnJa(v)).map(v => ({ id: v.id as string, naam: vanAnder(v) })),
    wachten: lijst.filter(v => mijnJa(v)).map(v => ({ id: v.id as string, naam: vanAnder(v) })),
    verzoeken: (verzoeken || []).map(v => ({ id: v.id as string, vriendNaam: v.vriend_naam as string, regeltNaam: (v.regelt_naam as string) || null })),
  }
}
export type VriendenStatus = Awaited<ReturnType<typeof vriendenStatus>>

/** Vragen van hoofdpersonen in een groep aan de familie: regel een vriend voor mij */
export async function vriendVerzoekenVanGroep(groepId: string) {
  const sinds = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data } = await createServiceClient().from('vriend_verzoeken')
    .select('id, hoofdpersoon, vriend_naam, regelt_door, regelt_naam')
    .eq('groep_id', groepId).gt('aangemaakt_op', sinds).order('aangemaakt_op', { ascending: true })
  const naamVan = await namen((data || []).map(v => v.hoofdpersoon as string))
  return (data || []).map(v => ({
    id: v.id as string,
    hoofdpersoonId: v.hoofdpersoon as string,
    hoofdpersoon: naamVan.get(v.hoofdpersoon) || '',
    vriendNaam: v.vriend_naam as string,
    regeltDoor: (v.regelt_door as string) || null,
    regeltNaam: (v.regelt_naam as string) || null,
  }))
}
export type VriendVerzoek = Awaited<ReturnType<typeof vriendVerzoekenVanGroep>>[number]

/** Bekenden van de hoofdpersonen in een groep, voor de familie (zonder berichten) */
export async function vriendenVanGroep(groepId: string) {
  const service = createServiceClient()
  const nu = new Date().toISOString()
  const [{ data: actief }, { data: open }, { data: zelf }] = await Promise.all([
    service.from('vriendschappen').select(VELDEN).in('status', ['actief', 'bevestigen']).or(`groep_a.eq.${groepId},groep_b.eq.${groepId}`),
    service.from('vriendschappen').select(VELDEN + ', aangemaakt_op').eq('status', 'uitgenodigd').eq('groep_a', groepId).gt('verloopt_op', nu),
    service.from('groepsleden').select('user_id').eq('groep_id', groepId).eq('rol', 'oudere').eq('vrienden_zelf', true),
  ])
  const lijst = (actief || []) as Vriendschap[]
  const ids = lijst.flatMap(v => [v.persoon_a, v.persoon_b as string])
  const naamVan = await namen(ids)
  return {
    actief: lijst.map(v => {
      const kant: Kant = v.groep_a === groepId ? 'a' : 'b'
      return {
        id: v.id,
        hoofdpersoon: persoonVan(v, kant),
        vriendNaam: naamVan.get(persoonVan(v, ander(kant))) || '',
        vervoer: vervoerVan(v, kant),
        wacht: v.status === 'bevestigen',
      }
    }),
    zelf: (zelf || []).map(z => z.user_id as string),
    open: ((open || []) as unknown as (Vriendschap & { aangemaakt_op: string })[]).map(v => ({
      id: v.id, hoofdpersoon: v.persoon_a, verloopt: v.verloopt_op as string,
    })),
  }
}

/** Geplande afspraken van de hoofdpersonen in een groep, voor het groepsscherm */
export async function samenAfsprakenVanGroep(groepId: string) {
  const service = createServiceClient()
  const { data: vs } = await service.from('vriendschappen').select(VELDEN)
    .eq('status', 'actief').or(`groep_a.eq.${groepId},groep_b.eq.${groepId}`)
  const lijst = (vs || []) as Vriendschap[]
  if (!lijst.length) return []
  const { data: afspraken } = await service.from('vriend_afspraken')
    .select('id, vriendschap_id, wat, eigen_tekst, waar, dag, dagdeel, vervoer_a, vervoer_b, brengt_a_naam, brengt_b_naam')
    .in('vriendschap_id', lijst.map(v => v.id)).eq('status', 'ja').gte('dag', vandaagNL())
    .order('dag', { ascending: true }).limit(10)
  const naamVan = await namen(lijst.flatMap(v => [v.persoon_a, v.persoon_b as string]))
  return (afspraken || []).map(a => {
    const v = lijst.find(x => x.id === a.vriendschap_id)!
    const kant: Kant = v.groep_a === groepId ? 'a' : 'b'
    return {
      id: a.id as string,
      kant,
      hoofdpersoon: naamVan.get(persoonVan(v, kant)) || '',
      vriend: naamVan.get(persoonVan(v, ander(kant))) || '',
      wat: a.wat as string,
      eigenTekst: a.eigen_tekst as string | null,
      waar: a.waar === 'ergens' ? 'ergens' : a.waar === kant ? 'thuis' : 'bijVriend',
      dag: a.dag as string,
      dagdeel: a.dagdeel as string,
      vervoerNodig: kant === 'a' ? a.vervoer_a : a.vervoer_b,
      brengtNaam: (kant === 'a' ? a.brengt_a_naam : a.brengt_b_naam) as string | null,
    }
  })
}
export type SamenAfspraak = Awaited<ReturnType<typeof samenAfsprakenVanGroep>>[number]

/**
 * Zacht signaal voor de beheerder: vroeg de hoofdpersoon deze week vaker om bezoek dan anders?
 * Minstens 3 keer deze week, en duidelijk meer dan het weekgemiddelde van de 4 weken ervoor.
 */
export async function vakerBezoekGevraagd(groepId: string) {
  const service = createServiceClient()
  const week = 7 * 86400000
  const sinds = new Date(Date.now() - 5 * week).toISOString()
  const { data } = await service.from('bezoekverzoeken').select('aangevraagd_naam, aangemaakt_op')
    .eq('groep_id', groepId).eq('soort', 'bezoek').gt('aangemaakt_op', sinds)
  const grens = Date.now() - week
  const dezeWeek = (data || []).filter(r => new Date(r.aangemaakt_op).getTime() > grens)
  const eerder = (data || []).length - dezeWeek.length
  const gemiddeld = eerder / 4
  if (dezeWeek.length < 3 || dezeWeek.length < gemiddeld * 1.5 + 1) return null
  return { naam: (dezeWeek[0]?.aangevraagd_naam as string) || null, aantal: dezeWeek.length }
}
