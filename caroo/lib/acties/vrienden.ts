'use server'

import crypto from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { magKoppelen } from '@/lib/koppelen'
import { stuurMelding } from '@/lib/meldingen'
import { getT } from '@/lib/i18n/server'
import { vandaagNL } from '@/lib/stemming'
import type { TFunctie } from '@/lib/i18n/vertaal'
import {
  MAX_VRIENDEN, VRIEND_UITNODIGING_DAGEN, aantalVrienden, ander, groepVan, hashCode, isHoofdpersoonIn,
  isVervoer, nieuweCode, persoonVan, vervoerVan, vriendschapVan, type Kant, type Vervoer, type Vriendschap,
} from '@/lib/vrienden'

const BASIS = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'
const WAT = ['koffie', 'wandelen', 'boodschappen', 'eigen'] as const
const DAGDELEN = ['ochtend', 'middag', 'avond'] as const
const MAX_WOORDEN = 40

async function ingelogd() {
  const { data: { user } } = await createClient().auth.getUser()
  return user
}
async function naamVan(id: string) {
  const { data } = await createServiceClient().from('users').select('naam').eq('id', id).maybeSingle()
  return (data?.naam as string) || ''
}

/** Leden van een groep die de hoofdpersoon kunnen helpen (iedereen behalve hoofdpersonen) */
async function familieVan(groepId: string) {
  const { data } = await createServiceClient().from('groepsleden').select('user_id, rol').eq('groep_id', groepId)
  return (data || []).filter(r => r.rol !== 'oudere').map(r => r.user_id as string)
}

function wanneerTekst(t: TFunctie, dag: string, dagdeel: string) {
  const vandaag = vandaagNL()
  const morgen = new Date(new Date(vandaag + 'T12:00:00').getTime() + 86400000).toISOString().slice(0, 10)
  const dagNaam = dag === vandaag ? t('vrienden.vandaag') : dag === morgen ? t('vrienden.morgen')
    : new Date(dag + 'T12:00:00').toLocaleDateString(t('vrienden.locale'), { weekday: 'long' })
  return t(`vrienden.dagdeelOp.${dagdeel}` as any, { dag: dagNaam.toLowerCase() })
}
function watTekst(t: TFunctie, wat: string, eigen: string | null) {
  return wat === 'eigen' && eigen ? eigen : t(`vrienden.watKort.${wat}` as any)
}

/* ───────────── Familie: koppelen en beheren ───────────── */

async function nieuweUitnodiging(groepId: string, hoofdpersoonId: string, vervoer: Vervoer, door: string, jaA: boolean, verzoekId: string | null) {
  const service = createServiceClient()
  // Eén open uitnodiging per hoofdpersoon: een oude vervalt
  await service.from('vriendschappen').delete().eq('persoon_a', hoofdpersoonId).eq('status', 'uitgenodigd')
  if ((await aantalVrienden(hoofdpersoonId)) >= MAX_VRIENDEN) return null
  const code = nieuweCode()
  const verloopt = new Date(Date.now() + VRIEND_UITNODIGING_DAGEN * 86400000).toISOString()
  const { data, error } = await service.from('vriendschappen').insert({
    persoon_a: hoofdpersoonId, groep_a: groepId, vervoer_a: vervoer, ja_a: jaA, verzoek_id: verzoekId,
    uitnodig_hash: hashCode(code), verloopt_op: verloopt, aangemaakt_door: door,
  }).select('id').single()
  if (error || !data) return null
  return { id: data.id as string, url: `${BASIS}/vriend/${code}`, verloopt }
}

export async function maakVriendUitnodiging(groepId: string, hoofdpersoonId: string, vervoer: string, verzoekId?: string | null) {
  const { t } = await getT()
  const user = await magKoppelen(groepId)
  if (!user) return { error: t('koppelen.geenRechten') }
  if (!isVervoer(vervoer) || !(await isHoofdpersoonIn(groepId, hoofdpersoonId))) return { error: t('algemeen.lukteNiet') }
  // Kwam de vraag van de hoofdpersoon zelf? Dan heeft zij al ja gezegd.
  let verzoek: string | null = null
  if (verzoekId) {
    const { data } = await createServiceClient().from('vriend_verzoeken').select('id')
      .eq('id', verzoekId).eq('groep_id', groepId).eq('hoofdpersoon', hoofdpersoonId).maybeSingle()
    verzoek = (data?.id as string) || null
  }
  const r = await nieuweUitnodiging(groepId, hoofdpersoonId, vervoer, user.id, !!verzoek, verzoek)
  if (!r) return { error: t('vrienden.familie.maxBereikt', { naam: await naamVan(hoofdpersoonId) }) }
  return r
}

/** Een hoofdpersoon die vrienden zelf regelt, maakt zelf een uitnodiging */
export async function maakEigenUitnodiging(groepId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user || !(await regeltZelf(groepId, user.id))) return { error: t('algemeen.lukteNiet') }
  const r = await nieuweUitnodiging(groepId, user.id, 'verschilt', user.id, true, null)
  if (!r) return { error: t('vrienden.maxVrienden') }
  return { ...r, naam: await naamVan(user.id) }
}

async function regeltZelf(groepId: string, userId: string) {
  const { data } = await createServiceClient().from('groepsleden').select('rol, vrienden_zelf')
    .eq('groep_id', groepId).eq('user_id', userId).maybeSingle()
  return data?.rol === 'oudere' && !!data.vrienden_zelf
}

/** De beheerder zet aan of uit dat de hoofdpersoon vrienden zelf regelt */
export async function zetVriendenZelf(groepId: string, hoofdpersoonId: string, aan: boolean) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const service = createServiceClient()
  const { data: ik } = await service.from('groepsleden').select('rol').eq('groep_id', groepId).eq('user_id', user.id).maybeSingle()
  if (ik?.rol !== 'groepsbeheerder') return { error: t('koppelen.geenRechten') }
  await service.from('groepsleden').update({ vrienden_zelf: !!aan }).eq('groep_id', groepId).eq('user_id', hoofdpersoonId).eq('rol', 'oudere')
  return { succes: true }
}

export async function trekUitnodigingIn(groepId: string, vriendschapId: string) {
  const { t } = await getT()
  if (!(await magKoppelen(groepId))) return { error: t('koppelen.geenRechten') }
  await createServiceClient().from('vriendschappen').delete()
    .eq('id', vriendschapId).eq('groep_a', groepId).eq('status', 'uitgenodigd')
  return { succes: true }
}

/** Wat de andere familie te zien krijgt voordat ze akkoord geven */
export async function bekijkVriendUitnodiging(code: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(code)) return null
  const { data } = await createServiceClient().from('vriendschappen')
    .select('id, persoon_a, verloopt_op').eq('uitnodig_hash', hashCode(code)).eq('status', 'uitgenodigd').maybeSingle()
  if (!data || !data.verloopt_op || new Date(data.verloopt_op) < new Date()) return null
  return { id: data.id as string, persoonA: data.persoon_a as string, naam: await naamVan(data.persoon_a) }
}

async function controleerKoppeling(a: string, b: string) {
  const service = createServiceClient()
  const { count: al } = await service.from('vriendschappen').select('id', { count: 'exact', head: true }).in('status', ['bevestigen', 'actief'])
    .or(`and(persoon_a.eq.${a},persoon_b.eq.${b}),and(persoon_a.eq.${b},persoon_b.eq.${a})`)
  if (al) return 'vrienden.familie.foutAl' as const
  // A telt zijn eigen open uitnodiging al mee
  if ((await aantalVrienden(a)) > MAX_VRIENDEN || (await aantalVrienden(b)) >= MAX_VRIENDEN) return 'vrienden.familie.foutMax' as const
  return null
}

async function zetKlaar(vriendschapId: string, b: string, groepId: string, vervoer: Vervoer, door: string, jaB: boolean) {
  const { data } = await createServiceClient().from('vriendschappen').update({
    persoon_b: b, groep_b: groepId, vervoer_b: vervoer, status: 'bevestigen', ja_b: jaB,
    uitnodig_hash: null, verloopt_op: null, goedgekeurd_door: door,
  }).eq('id', vriendschapId).eq('status', 'uitgenodigd').select('id').maybeSingle()
  if (!data) return false
  await rondAfOfVraag(vriendschapId)
  return true
}

/** Hebben beiden ja gezegd? Dan zijn ze vrienden. Anders krijgt wie nog moet kiezen de vraag. */
async function rondAfOfVraag(vriendschapId: string) {
  const service = createServiceClient()
  const { data: v } = await service.from('vriendschappen')
    .select('id, persoon_a, groep_a, persoon_b, groep_b, ja_a, ja_b, verzoek_id, status').eq('id', vriendschapId).maybeSingle()
  if (!v || v.status !== 'bevestigen' || !v.persoon_b) return
  const [naamA, naamB] = await Promise.all([naamVan(v.persoon_a), naamVan(v.persoon_b)])

  if (v.ja_a && v.ja_b) {
    await service.from('vriendschappen').update({ status: 'actief', actief_sinds: new Date().toISOString() }).eq('id', v.id)
    if (v.verzoek_id) await service.from('vriend_verzoeken').delete().eq('id', v.verzoek_id)
    await Promise.all([
      stuurMelding([v.persoon_a], tt => ({ titel: tt('vrienden.meldingGekoppeld', { naam: naamB }), tekst: tt('vrienden.meldingGekoppeldTekst'), url: `/oudere/${v.groep_a}`, tag: `vriend-${v.id}` })),
      stuurMelding([v.persoon_b], tt => ({ titel: tt('vrienden.meldingGekoppeld', { naam: naamA }), tekst: tt('vrienden.meldingGekoppeldTekst'), url: `/oudere/${v.groep_b}`, tag: `vriend-${v.id}` })),
      stuurMelding(await familieVan(v.groep_a), tt => ({ titel: tt('vrienden.familie.gelukt', { a: naamA, b: naamB }), tekst: tt('vrienden.familie.privacy'), url: `/groep/${v.groep_a}/vrienden` })),
      stuurMelding(await familieVan(v.groep_b), tt => ({ titel: tt('vrienden.familie.gelukt', { a: naamB, b: naamA }), tekst: tt('vrienden.familie.privacy'), url: `/groep/${v.groep_b}/vrienden` })),
    ])
    return
  }
  if (!v.ja_a) await stuurMelding([v.persoon_a], tt => ({ titel: tt('vrienden.meldingVraag', { naam: naamB }), tekst: tt('vrienden.meldingVraagTekst'), url: `/oudere/${v.groep_a}`, tag: `vriend-${v.id}` }))
  if (!v.ja_b) await stuurMelding([v.persoon_b], tt => ({ titel: tt('vrienden.meldingVraag', { naam: naamA }), tekst: tt('vrienden.meldingVraagTekst'), url: `/oudere/${v.groep_b}`, tag: `vriend-${v.id}` }))
}

/** De familie van de vriend zet het klaar. Daarna kiest hun hoofdpersoon zelf. */
export async function accepteerVriendUitnodiging(code: string, groepId: string, hoofdpersoonId: string, vervoer: string) {
  const { t } = await getT()
  const user = await magKoppelen(groepId)
  if (!user) return { error: t('koppelen.geenRechten') }
  const uitnodiging = await bekijkVriendUitnodiging(code)
  if (!uitnodiging) return { error: t('vrienden.familie.ongeldig') }
  if (!isVervoer(vervoer) || !(await isHoofdpersoonIn(groepId, hoofdpersoonId))) return { error: t('algemeen.lukteNiet') }
  if (hoofdpersoonId === uitnodiging.persoonA) return { error: t('vrienden.familie.foutZelf') }
  const fout = await controleerKoppeling(uitnodiging.persoonA, hoofdpersoonId)
  if (fout) return { error: t(fout) }
  if (!(await zetKlaar(uitnodiging.id, hoofdpersoonId, groepId, vervoer, user.id, false))) return { error: t('vrienden.familie.ongeldig') }
  return { succes: true, naamA: uitnodiging.naam, naamB: await naamVan(hoofdpersoonId) }
}

/** Een hoofdpersoon die vrienden zelf regelt, zegt meteen zelf ja op de uitnodiging */
export async function accepteerZelf(code: string, groepId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user || !(await regeltZelf(groepId, user.id))) return { error: t('algemeen.lukteNiet') }
  const uitnodiging = await bekijkVriendUitnodiging(code)
  if (!uitnodiging) return { error: t('vrienden.familie.ongeldig') }
  if (user.id === uitnodiging.persoonA) return { error: t('vrienden.familie.foutZelf') }
  const fout = await controleerKoppeling(uitnodiging.persoonA, user.id)
  if (fout) return { error: t(fout) }
  if (!(await zetKlaar(uitnodiging.id, user.id, groepId, 'verschilt', user.id, true))) return { error: t('vrienden.familie.ongeldig') }
  const { data: nu } = await createServiceClient().from('vriendschappen').select('status').eq('id', uitnodiging.id).maybeSingle()
  return { succes: true, groepId, actief: nu?.status === 'actief' }
}

/** De hoofdpersoon kiest zelf: wil ik vrienden worden? */
export async function beantwoordVriendschap(vriendschapId: string, ja: boolean) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const service = createServiceClient()
  const { data: v } = await service.from('vriendschappen')
    .select('id, persoon_a, groep_a, persoon_b, groep_b, aangemaakt_door, goedgekeurd_door').eq('id', vriendschapId).eq('status', 'bevestigen').maybeSingle()
  if (!v) return { error: t('algemeen.lukteNiet') }
  const kant = v.persoon_a === user.id ? 'a' : v.persoon_b === user.id ? 'b' : null
  if (!kant) return { error: t('algemeen.lukteNiet') }

  if (!ja) {
    const [naamA, naamB] = await Promise.all([naamVan(v.persoon_a), naamVan(v.persoon_b as string)])
    await verwijderVriendschap(v.id)
    // Rustig laten weten aan wie het klaarzette, zonder te zeggen wie nee zei
    await stuurMelding([v.aangemaakt_door, v.goedgekeurd_door].filter(Boolean) as string[], tt => ({
      titel: tt('vrienden.familie.gaatNietDoor', { a: naamA, b: naamB }), tekst: tt('vrienden.familie.gaatNietDoorTekst'), url: '/dashboard',
    }))
    return { succes: true }
  }
  await service.from('vriendschappen').update({ [`ja_${kant}`]: true }).eq('id', v.id)
  await rondAfOfVraag(v.id)
  return { succes: true }
}

/* De hoofdpersoon vraagt de familie: regel een vriend voor mij */

export async function vraagVriendAan(groepId: string, vriendNaam: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const naam = (vriendNaam || '').trim().slice(0, 60)
  if (!naam || !(await isHoofdpersoonIn(groepId, user.id))) return { error: t('algemeen.lukteNiet') }
  const service = createServiceClient()
  const sinds = new Date(Date.now() - 30 * 86400000).toISOString()
  const { count: open } = await service.from('vriend_verzoeken').select('id', { count: 'exact', head: true })
    .eq('hoofdpersoon', user.id).gt('aangemaakt_op', sinds)
  if ((await aantalVrienden(user.id)) + (open ?? 0) >= MAX_VRIENDEN) return { error: t('vrienden.maxVrienden') }

  const { data, error } = await service.from('vriend_verzoeken')
    .insert({ groep_id: groepId, hoofdpersoon: user.id, vriend_naam: naam }).select('id').single()
  if (error || !data) return { error: t('algemeen.lukteNiet') }
  const mijnNaam = await naamVan(user.id)
  await stuurMelding(await familieVan(groepId), tt => ({
    titel: tt('vrienden.familie.verzoekTitel', { naam: mijnNaam, vriend: naam }), tekst: tt('vrienden.familie.verzoekTekst'),
    url: `/groep/${groepId}`, tag: `verzoek-${data.id}`,
  }))
  return { succes: true }
}

export async function trekVriendVerzoekIn(verzoekId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  await createServiceClient().from('vriend_verzoeken').delete().eq('id', verzoekId).eq('hoofdpersoon', user.id)
  return { succes: true }
}

/** Iemand uit de familie neemt de vraag op zich */
export async function regelVriendVerzoek(groepId: string, verzoekId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  if (!(await familieVan(groepId)).includes(user.id)) return { error: t('algemeen.lukteNiet') }
  const service = createServiceClient()
  const naam = (await naamVan(user.id)) || t('algemeen.iemand')
  const { data } = await service.from('vriend_verzoeken')
    .update({ regelt_door: user.id, regelt_naam: naam, regelt_op: new Date().toISOString() })
    .eq('id', verzoekId).eq('groep_id', groepId).is('regelt_door', null).select('hoofdpersoon, vriend_naam').maybeSingle()
  if (!data) {
    const { data: al } = await service.from('vriend_verzoeken').select('regelt_door, regelt_naam').eq('id', verzoekId).maybeSingle()
    if (al?.regelt_door === user.id) return { succes: true, naam }
    return { alGeregeld: true, naam: (al?.regelt_naam as string) || null }
  }
  const anderen = (await familieVan(groepId)).filter(id => id !== user.id)
  await Promise.all([
    stuurMelding(anderen, tt => ({
      titel: tt('vrienden.familie.verzoekGeregeld', { naam, vriend: data.vriend_naam }), tekst: tt('bezoek.geregeldTekst'),
      url: `/groep/${groepId}`, tag: `verzoek-${verzoekId}`,
    })),
    stuurMelding([data.hoofdpersoon], tt => ({
      titel: tt('vrienden.regeltHet', { naam }), tekst: tt('vrienden.meldingRegeltTekst'), url: `/oudere/${groepId}`, tag: `verzoek-${verzoekId}`,
    })),
  ])
  return { succes: true, naam }
}

/** De familie stelt in of hun hoofdpersoon vervoer nodig heeft */
export async function wijzigVervoer(groepId: string, vriendschapId: string, vervoer: string) {
  const { t } = await getT()
  if (!(await magKoppelen(groepId)) || !isVervoer(vervoer)) return { error: t('algemeen.lukteNiet') }
  const service = createServiceClient()
  const { data } = await service.from('vriendschappen').select('groep_a, groep_b').eq('id', vriendschapId).maybeSingle()
  if (!data) return { error: t('algemeen.lukteNiet') }
  const veld = data.groep_a === groepId ? 'vervoer_a' : data.groep_b === groepId ? 'vervoer_b' : null
  if (!veld) return { error: t('algemeen.lukteNiet') }
  await service.from('vriendschappen').update({ [veld]: vervoer }).eq('id', vriendschapId)
  return { succes: true }
}

async function verwijderVriendschap(vriendschapId: string) {
  const service = createServiceClient()
  const { data: fotos } = await service.from('vriend_berichten').select('foto_pad').eq('vriendschap_id', vriendschapId).not('foto_pad', 'is', null)
  const paden = (fotos || []).map(f => f.foto_pad as string)
  if (paden.length) await service.storage.from('fotos').remove(paden).catch(() => {})
  await service.from('vriendschappen').delete().eq('id', vriendschapId)
}

export async function verbreekVriendschap(groepId: string, vriendschapId: string) {
  const { t } = await getT()
  if (!(await magKoppelen(groepId))) return { error: t('koppelen.geenRechten') }
  const { data } = await createServiceClient().from('vriendschappen').select('groep_a, groep_b').eq('id', vriendschapId).maybeSingle()
  if (!data || (data.groep_a !== groepId && data.groep_b !== groepId)) return { error: t('algemeen.lukteNiet') }
  await verwijderVriendschap(vriendschapId)
  return { succes: true }
}

/** Iemand uit de familie brengt de hoofdpersoon naar de afspraak */
export async function brengIk(groepId: string, afspraakId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  if (!(await familieVan(groepId)).includes(user.id)) return { error: t('algemeen.lukteNiet') }

  const service = createServiceClient()
  const { data: a } = await service.from('vriend_afspraken').select('id, vriendschap_id, wat, eigen_tekst, dag, dagdeel').eq('id', afspraakId).maybeSingle()
  if (!a) return { error: t('algemeen.lukteNiet') }
  const { data: v } = await service.from('vriendschappen').select('id, persoon_a, groep_a, persoon_b, groep_b').eq('id', a.vriendschap_id).maybeSingle()
  if (!v) return { error: t('algemeen.lukteNiet') }
  const kant: Kant | null = v.groep_a === groepId ? 'a' : v.groep_b === groepId ? 'b' : null
  if (!kant) return { error: t('algemeen.lukteNiet') }

  const naam = (await naamVan(user.id)) || t('algemeen.iemand')
  const { data: gezet } = await service.from('vriend_afspraken')
    .update({ [`brengt_${kant}_door`]: user.id, [`brengt_${kant}_naam`]: naam })
    .eq('id', afspraakId).is(`brengt_${kant}_door`, null).select('id').maybeSingle()
  if (!gezet) {
    const { data: al } = await service.from('vriend_afspraken').select(`brengt_${kant}_naam`).eq('id', afspraakId).maybeSingle()
    return { alGeregeld: true, naam: ((al as any)?.[`brengt_${kant}_naam`] as string) || null }
  }

  const hoofdpersoonId = kant === 'a' ? v.persoon_a : v.persoon_b
  const hoofdpersoon = await naamVan(hoofdpersoonId)
  const anderen = (await familieVan(groepId)).filter(id => id !== user.id)
  await Promise.all([
    stuurMelding(anderen, tt => ({
      titel: tt('vrienden.familie.geregeld', { naam, hoofdpersoon }), tekst: tt('bezoek.geregeldTekst'),
      url: `/groep/${groepId}`, tag: `samen-${afspraakId}-${kant}`,
    })),
    stuurMelding([hoofdpersoonId], tt => ({
      titel: tt('vrienden.brengt', { naam }), tekst: `${watTekst(tt, a.wat, a.eigen_tekst)}, ${wanneerTekst(tt, a.dag, a.dagdeel)}`,
      url: `/oudere/${groepId}`, tag: `samen-${afspraakId}`,
    })),
  ])
  return { succes: true, naam }
}

/* ───────────── Hoofdpersoon: praten, spelen, samen iets doen ───────────── */

export async function laadVriend(vriendschapId: string) {
  const user = await ingelogd()
  if (!user) return null
  const gevonden = await vriendschapVan(vriendschapId, user.id)
  if (!gevonden) return null
  const { v, kant } = gevonden
  const service = createServiceClient()
  const vriendId = persoonVan(v, ander(kant))

  const [vriendNaam, { data: berichten }, { data: spel }, { data: afspraken }] = await Promise.all([
    naamVan(vriendId),
    service.from('vriend_berichten').select('id, van, tekst, foto_pad, aangemaakt_op')
      .eq('vriendschap_id', v.id).order('aangemaakt_op', { ascending: false }).limit(40),
    service.from('vriend_spellen').select('woorden, beurt').eq('vriendschap_id', v.id).maybeSingle(),
    service.from('vriend_afspraken')
      .select('id, voorgesteld_door, wat, eigen_tekst, waar, dag, dagdeel, status, vervoer_a, vervoer_b, brengt_a_naam, brengt_b_naam')
      .eq('vriendschap_id', v.id).gte('dag', vandaagNL()).neq('status', 'nee').order('dag', { ascending: true }).limit(5),
  ])

  // Gelezen markeren
  await service.from('vriend_berichten').update({ gelezen_op: new Date().toISOString() })
    .eq('vriendschap_id', v.id).neq('van', user.id).is('gelezen_op', null)

  const metUrl = await Promise.all((berichten || []).reverse().map(async b => {
    let foto: string | null = null
    if (b.foto_pad) {
      const { data } = await service.storage.from('fotos').createSignedUrl(b.foto_pad, 3600)
      foto = data?.signedUrl || null
    }
    return { id: b.id as string, vanMij: b.van === user.id, tekst: b.tekst as string | null, foto, op: b.aangemaakt_op as string }
  }))

  return {
    id: v.id,
    vriendNaam,
    mijnVervoer: vervoerVan(v, kant),
    berichten: metUrl,
    spel: spel ? { woorden: (spel.woorden as { w: string; mij?: boolean; van: string }[]).map(x => ({ w: x.w, vanMij: x.van === user.id })), mijnBeurt: spel.beurt === user.id } : null,
    afspraken: (afspraken || []).map(a => ({
      id: a.id as string,
      vanMij: a.voorgesteld_door === user.id,
      wat: a.wat as string,
      eigenTekst: a.eigen_tekst as string | null,
      waar: a.waar === 'ergens' ? 'ergens' as const : a.waar === kant ? 'bijMij' as const : 'bijVriend' as const,
      dag: a.dag as string,
      dagdeel: a.dagdeel as string,
      status: a.status as 'gevraagd' | 'ja',
      ikVervoer: kant === 'a' ? a.vervoer_a : a.vervoer_b,
      brengtMij: (kant === 'a' ? a.brengt_a_naam : a.brengt_b_naam) as string | null,
    })),
  }
}
export type VriendDetail = NonNullable<Awaited<ReturnType<typeof laadVriend>>>

export async function stuurBericht(vriendschapId: string, tekst: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const gevonden = await vriendschapVan(vriendschapId, user.id)
  const schoon = (tekst || '').trim().slice(0, 500)
  if (!gevonden || !schoon) return { error: t('algemeen.lukteNiet') }
  const { error } = await createServiceClient().from('vriend_berichten').insert({ vriendschap_id: vriendschapId, van: user.id, tekst: schoon })
  if (error) return { error: t('algemeen.lukteNiet') }
  await meldVriend(gevonden.v, gevonden.kant, user.id, tt => tt('vrienden.meldingBericht', { naam: '{naam}' }), schoon)
  return { succes: true }
}

export async function stuurVriendFoto(vriendschapId: string, formulier: FormData) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const gevonden = await vriendschapVan(vriendschapId, user.id)
  const bestand = formulier.get('foto')
  if (!gevonden || !(bestand instanceof Blob) || bestand.size === 0 || bestand.size > 4 * 1024 * 1024) return { error: t('algemeen.lukteNiet') }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(bestand.type)) return { error: t('algemeen.lukteNiet') }

  const service = createServiceClient()
  const ext = bestand.type === 'image/png' ? 'png' : bestand.type === 'image/webp' ? 'webp' : 'jpg'
  const pad = `vriend/${vriendschapId}/${crypto.randomUUID()}.${ext}`
  const { error: upFout } = await service.storage.from('fotos').upload(pad, bestand, { contentType: bestand.type })
  if (upFout) return { error: t('algemeen.lukteNiet') }
  const { error } = await service.from('vriend_berichten').insert({ vriendschap_id: vriendschapId, van: user.id, foto_pad: pad })
  if (error) { await service.storage.from('fotos').remove([pad]).catch(() => {}); return { error: t('algemeen.lukteNiet') } }
  await meldVriend(gevonden.v, gevonden.kant, user.id, tt => tt('vrienden.meldingFoto', { naam: '{naam}' }), null)
  return { succes: true }
}

/** Melding naar de vriend. Eén tag per vriendschap, zodat berichten niet opstapelen. */
async function meldVriend(v: Vriendschap, kant: Kant, van: string, titel: (t: TFunctie) => string, tekst: string | null) {
  const naam = await naamVan(van)
  const naar = persoonVan(v, ander(kant))
  await stuurMelding([naar], tt => ({
    titel: titel(tt).split('{naam}').join(naam),
    tekst: tekst ? (tekst.length > 80 ? tekst.slice(0, 77) + '...' : tekst) : tt('vrienden.meldingGekoppeldTekst'),
    url: `/oudere/${groepVan(v, ander(kant))}`,
    tag: `vriend-${v.id}`,
  }))
}

/* Woordketting */

function normaal(w: string) {
  return w.trim().toLocaleLowerCase('nl-NL').normalize('NFC')
}
function laatsteLetter(w: string) {
  const letters = Array.from(w.normalize('NFD').replace(new RegExp('\\p{M}', 'gu'), ''))
  return letters[letters.length - 1] || ''
}
function eersteLetter(w: string) {
  return Array.from(w.normalize('NFD').replace(new RegExp('\\p{M}', 'gu'), ''))[0] || ''
}

export async function legWoord(vriendschapId: string, woord: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const gevonden = await vriendschapVan(vriendschapId, user.id)
  if (!gevonden) return { error: t('algemeen.lukteNiet') }
  const w = normaal(woord || '')
  if (!new RegExp('^\\p{L}{2,20}$', 'u').test(w)) return { error: t('vrienden.spelFoutWoord') }

  const service = createServiceClient()
  const { data: spel } = await service.from('vriend_spellen').select('woorden, beurt').eq('vriendschap_id', vriendschapId).maybeSingle()
  const woorden = (spel?.woorden as { w: string; van: string }[]) || []
  const vriendId = persoonVan(gevonden.v, ander(gevonden.kant))
  if (spel && woorden.length > 0 && spel.beurt !== user.id) return { error: t('vrienden.spelNietJouwBeurt', { naam: await naamVan(vriendId) }) }
  const vorige = woorden[woorden.length - 1]
  if (vorige && eersteLetter(w) !== laatsteLetter(vorige.w)) return { error: t('vrienden.spelFoutLetter', { letter: laatsteLetter(vorige.w).toUpperCase() }) }
  if (woorden.some(x => x.w === w)) return { error: t('vrienden.spelFoutAl') }

  const nieuw = [...woorden, { w, van: user.id }].slice(-MAX_WOORDEN)
  const { error } = await service.from('vriend_spellen').upsert({
    vriendschap_id: vriendschapId, woorden: nieuw, beurt: vriendId, bijgewerkt_op: new Date().toISOString(),
  })
  if (error) return { error: t('algemeen.lukteNiet') }
  const naam = await naamVan(user.id)
  await stuurMelding([vriendId], tt => ({
    titel: tt('vrienden.meldingBeurt', { naam }), tekst: w.toUpperCase(),
    url: `/oudere/${groepVan(gevonden.v, ander(gevonden.kant))}`, tag: `spel-${vriendschapId}`,
  }))
  return { succes: true }
}

export async function nieuwSpel(vriendschapId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user || !(await vriendschapVan(vriendschapId, user.id))) return { error: t('algemeen.lukteNiet') }
  await createServiceClient().from('vriend_spellen').upsert({ vriendschap_id: vriendschapId, woorden: [], beurt: user.id, bijgewerkt_op: new Date().toISOString() })
  return { succes: true }
}

/* Samen iets doen */

function bepaalVervoer(instelling: Vervoer, bijMijThuis: boolean, antwoord: boolean | null) {
  if (bijMijThuis || instelling === 'zelf') return false
  if (instelling === 'nodig') return true
  return !!antwoord
}

export async function stelSamenVoor(vriendschapId: string, voorstel: {
  wat: string; eigenTekst?: string; waar: 'bijMij' | 'bijVriend' | 'ergens'; dag: string; dagdeel: string; vervoer?: boolean | null
}) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const gevonden = await vriendschapVan(vriendschapId, user.id)
  if (!gevonden) return { error: t('algemeen.lukteNiet') }
  const { v, kant } = gevonden
  const eigen = (voorstel.eigenTekst || '').trim().slice(0, 80)
  if (!(WAT as readonly string[]).includes(voorstel.wat) || (voorstel.wat === 'eigen' && !eigen)) return { error: t('algemeen.lukteNiet') }
  if (!(DAGDELEN as readonly string[]).includes(voorstel.dagdeel) || !/^\d{4}-\d{2}-\d{2}$/.test(voorstel.dag) || voorstel.dag < vandaagNL()) return { error: t('algemeen.lukteNiet') }
  const waar = voorstel.waar === 'bijMij' ? kant : voorstel.waar === 'bijVriend' ? ander(kant) : 'ergens'

  const service = createServiceClient()
  const { data, error } = await service.from('vriend_afspraken').insert({
    vriendschap_id: v.id, voorgesteld_door: user.id, wat: voorstel.wat, eigen_tekst: voorstel.wat === 'eigen' ? eigen : null,
    waar, dag: voorstel.dag, dagdeel: voorstel.dagdeel,
    [`vervoer_${kant}`]: bepaalVervoer(vervoerVan(v, kant), waar === kant, voorstel.vervoer ?? null),
  }).select('id').single()
  if (error || !data) return { error: t('algemeen.lukteNiet') }

  const naam = await naamVan(user.id)
  await stuurMelding([persoonVan(v, ander(kant))], tt => ({
    titel: tt('vrienden.meldingVraagTitel', { naam }),
    tekst: `${watTekst(tt, voorstel.wat, eigen)}, ${wanneerTekst(tt, voorstel.dag, voorstel.dagdeel)}`,
    url: `/oudere/${groepVan(v, ander(kant))}`, tag: `samen-${data.id}`,
  }))
  return { succes: true }
}

export async function beantwoordSamen(afspraakId: string, ja: boolean, vervoer?: boolean | null) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const service = createServiceClient()
  const { data: a } = await service.from('vriend_afspraken').select('id, vriendschap_id, voorgesteld_door, wat, eigen_tekst, waar, dag, dagdeel, vervoer_a, vervoer_b')
    .eq('id', afspraakId).eq('status', 'gevraagd').maybeSingle()
  if (!a || a.voorgesteld_door === user.id) return { error: t('algemeen.lukteNiet') }
  const gevonden = await vriendschapVan(a.vriendschap_id, user.id)
  if (!gevonden) return { error: t('algemeen.lukteNiet') }
  const { v, kant } = gevonden

  const ikVervoer = ja ? bepaalVervoer(vervoerVan(v, kant), a.waar === kant, vervoer ?? null) : false
  const { data: gezet } = await service.from('vriend_afspraken').update({
    status: ja ? 'ja' : 'nee', beantwoord_op: new Date().toISOString(), [`vervoer_${kant}`]: ikVervoer,
  }).eq('id', afspraakId).eq('status', 'gevraagd').select('id').maybeSingle()
  if (!gezet) return { error: t('algemeen.lukteNiet') }

  const mijnNaam = await naamVan(user.id)
  const vriendKant = ander(kant)
  const vriendId = persoonVan(v, vriendKant)
  const vriendNaam = await naamVan(vriendId)
  const wanneer = (tt: TFunctie) => `${watTekst(tt, a.wat, a.eigen_tekst)}, ${wanneerTekst(tt, a.dag, a.dagdeel)}`

  await stuurMelding([vriendId], tt => ({
    titel: ja ? tt('vrienden.meldingJaTitel', { naam: mijnNaam }) : tt('vrienden.meldingNeeTitel', { naam: mijnNaam }),
    tekst: ja ? wanneer(tt) : tt('vrienden.afgewezenTekst'),
    url: `/oudere/${groepVan(v, vriendKant)}`, tag: `samen-${afspraakId}`,
  }))

  if (ja) {
    // Beide families: wat is er gepland, en is er vervoer nodig?
    const vervoerNodig: Record<Kant, boolean> = { a: kant === 'a' ? ikVervoer : !!a.vervoer_a, b: kant === 'b' ? ikVervoer : !!a.vervoer_b }
    for (const k of ['a', 'b'] as Kant[]) {
      const groepId = groepVan(v, k)
      const hoofdpersoon = k === kant ? mijnNaam : vriendNaam
      const vriend = k === kant ? vriendNaam : mijnNaam
      await stuurMelding(await familieVan(groepId), tt => ({
        titel: tt('vrienden.familie.gepland', { hoofdpersoon, vriend }),
        tekst: vervoerNodig[k] ? `${wanneer(tt)}. ${tt('vrienden.familie.brengVraag', { naam: hoofdpersoon })}` : wanneer(tt),
        url: `/groep/${groepId}`, tag: `samen-${afspraakId}-${k}`,
      }))
    }
  }
  return { succes: true }
}

export async function trekSamenIn(afspraakId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  await createServiceClient().from('vriend_afspraken').delete().eq('id', afspraakId).eq('voorgesteld_door', user.id).eq('status', 'gevraagd')
  return { succes: true }
}

/** De hoofdpersoon stopt zelf met deze vriend */
export async function stopMetVriend(vriendschapId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user || !(await vriendschapVan(vriendschapId, user.id))) return { error: t('algemeen.lukteNiet') }
  await verwijderVriendschap(vriendschapId)
  return { succes: true }
}
