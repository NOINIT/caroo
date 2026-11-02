'use server'

import crypto from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stuurMelding } from '@/lib/meldingen'
import { getT } from '@/lib/i18n/server'
import { ander, groepVan, persoonVan, vriendschapVan } from '@/lib/vrienden'
import type { TFunctie } from '@/lib/i18n/vertaal'
import * as D from '@/lib/spellen/dobbelen'
import * as M from '@/lib/spellen/dammen'
import * as S from '@/lib/spellen/schaken'

export type Soort = 'dobbelen' | 'dammen' | 'schaken'
const SOORTEN: Soort[] = ['dobbelen', 'dammen', 'schaken']

/** Met wie speel je: een vriend (twee hoofdpersonen) of iemand uit de eigen groep (familielid en hoofdpersoon) */
export type Doel = { vriendschap: string } | { groep: string; met: string }

async function ingelogd() {
  const { data: { user } } = await createClient().auth.getUser()
  return user
}
async function naamVan(id: string) {
  const { data } = await createServiceClient().from('users').select('naam').eq('id', id).maybeSingle()
  return (data?.naam as string) || ''
}
async function rolIn(groepId: string, userId: string) {
  const { data } = await createServiceClient().from('groepsleden').select('rol').eq('groep_id', groepId).eq('user_id', userId).maybeSingle()
  return (data?.rol as string) || null
}

/** Een eerlijke dobbelsteen: 1 tot en met 6 */
const steen = () => crypto.randomInt(1, 7)

interface Partij {
  tegen: string
  /** Waar de tegenstander het potje vindt */
  urlTegen: string
  /** Velden om een potje mee te zoeken of aan te maken */
  sleutel: Record<string, string>
}

/** Wie speelt er tegen wie, en mag deze gebruiker meedoen? */
async function partijVoor(doel: Doel, userId: string): Promise<Partij | null> {
  if ('vriendschap' in doel) {
    const v = await vriendschapVan(doel.vriendschap, userId)
    if (!v) return null
    return { tegen: persoonVan(v.v, ander(v.kant)), urlTegen: `/oudere/${groepVan(v.v, ander(v.kant))}`, sleutel: { vriendschap_id: doel.vriendschap } }
  }
  if (doel.met === userId) return null
  const [ik, hij] = await Promise.all([rolIn(doel.groep, userId), rolIn(doel.groep, doel.met)])
  if (!ik || !hij) return null
  // Precies één van de twee is de hoofdpersoon
  if ((ik === 'oudere') === (hij === 'oudere')) return null
  const familie = ik === 'oudere' ? doel.met : userId
  const hoofd = ik === 'oudere' ? userId : doel.met
  return {
    tegen: doel.met,
    urlTegen: hij === 'oudere' ? `/oudere/${doel.groep}` : `/groep/${doel.groep}/spelen?met=${userId}`,
    sleutel: { groep_id: doel.groep, speler_a: familie, speler_b: hoofd },
  }
}

const VELDEN = 'id, vriendschap_id, groep_id, speler_a, speler_b, soort, toestand, beurt, status, winnaar, gelijk, bijgewerkt_op'

/** Laad een potje en controleer dat deze gebruiker meespeelt */
async function potjeVoor(potjeId: string, userId: string) {
  const { data: p } = await createServiceClient().from('vriend_potjes').select(VELDEN).eq('id', potjeId).maybeSingle()
  if (!p) return null
  const doel: Doel = p.vriendschap_id
    ? { vriendschap: p.vriendschap_id }
    : { groep: p.groep_id, met: p.speler_a === userId ? p.speler_b : p.speler_a }
  if (!p.vriendschap_id && p.speler_a !== userId && p.speler_b !== userId) return null
  const partij = await partijVoor(doel, userId)
  if (!partij) return null
  return { p, partij }
}

const spelNaam = (tt: TFunctie, soort: string) => tt(`spellen.${soort}` as any)

export async function startPotje(doel: Doel, soort: Soort) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user || !SOORTEN.includes(soort)) return { error: t('algemeen.lukteNiet') }
  const partij = await partijVoor(doel, user.id)
  if (!partij) return { error: t('algemeen.lukteNiet') }
  const service = createServiceClient()
  let zoek = service.from('vriend_potjes').select('id').eq('soort', soort).eq('status', 'bezig')
  for (const [k, v] of Object.entries(partij.sleutel)) zoek = zoek.eq(k, v)
  const { data: al } = await zoek.maybeSingle()
  if (al) return { id: al.id as string }

  // Wie begint, speelt met wit en zet als eerste
  const toestand = soort === 'dobbelen' ? D.nieuwDobbelen(user.id, partij.tegen)
    : soort === 'dammen' ? M.nieuwDammen(user.id, partij.tegen) : S.nieuwSchaken(user.id, partij.tegen)
  const { data, error } = await service.from('vriend_potjes')
    .insert({ ...partij.sleutel, soort, toestand, beurt: user.id }).select('id').single()
  if (error || !data) return { error: t('algemeen.lukteNiet') }
  const naam = await naamVan(user.id)
  await stuurMelding([partij.tegen], tt => ({
    titel: tt('spellen.meldingStart', { naam, spel: spelNaam(tt, soort) }), tekst: tt('spellen.meldingStartTekst'),
    url: partij.urlTegen, tag: `potje-${data.id}`,
  }))
  return { id: data.id as string }
}

/** Sla de nieuwe stand op. Alleen als niemand er tussendoor iets aan veranderde. */
async function bewaar(
  ctx: NonNullable<Awaited<ReturnType<typeof potjeVoor>>>, userId: string, toestand: unknown,
  volgende: string | null, einde: { winnaar: string | null; gelijk: boolean } | null,
) {
  const { t } = await getT()
  const { data } = await createServiceClient().from('vriend_potjes').update({
    toestand, beurt: einde ? null : volgende, status: einde ? 'klaar' : 'bezig',
    winnaar: einde?.winnaar ?? null, gelijk: einde?.gelijk ?? false, bijgewerkt_op: new Date().toISOString(),
  }).eq('id', ctx.p.id).eq('bijgewerkt_op', ctx.p.bijgewerkt_op).select('id').maybeSingle()
  if (!data) return { error: t('algemeen.lukteNiet') }

  const tegen = ctx.partij.tegen
  if (einde || volgende === tegen) {
    const naam = await naamVan(userId)
    await stuurMelding([tegen], tt => ({
      titel: einde
        ? (einde.gelijk ? tt('spellen.meldingGelijk', { spel: spelNaam(tt, ctx.p.soort), naam })
          : einde.winnaar === tegen ? tt('spellen.meldingGewonnen', { spel: spelNaam(tt, ctx.p.soort), naam })
          : tt('spellen.meldingVerloren', { spel: spelNaam(tt, ctx.p.soort), naam }))
        : tt('spellen.meldingBeurt', { spel: spelNaam(tt, ctx.p.soort), naam }),
      tekst: tt('spellen.meldingStartTekst'),
      url: ctx.partij.urlTegen, tag: `potje-${ctx.p.id}`,
    }))
  }
  return { succes: true }
}

async function voorbereiden(potjeId: string, soort: Soort) {
  const user = await ingelogd()
  if (!user) return null
  const ctx = await potjeVoor(potjeId, user.id)
  if (!ctx || ctx.p.soort !== soort || ctx.p.status !== 'bezig' || ctx.p.beurt !== user.id) return null
  return { user, ctx }
}

export async function dobbelGooi(potjeId: string, vast: boolean[]) {
  const { t } = await getT()
  const k = await voorbereiden(potjeId, 'dobbelen')
  if (!k) return { error: t('algemeen.lukteNiet') }
  const nieuw = D.gooi(k.ctx.p.toestand as D.Dobbelen, vast, steen)
  if (typeof nieuw === 'string') return { error: t('algemeen.lukteNiet') }
  return bewaar(k.ctx, k.user.id, nieuw, k.user.id, null)
}

export async function dobbelKies(potjeId: string, vak: D.Vak) {
  const { t } = await getT()
  const k = await voorbereiden(potjeId, 'dobbelen')
  if (!k) return { error: t('algemeen.lukteNiet') }
  const nieuw = D.kiesVak(k.ctx.p.toestand as D.Dobbelen, k.user.id, vak)
  if (typeof nieuw === 'string') return { error: t('algemeen.lukteNiet') }
  const w = D.winnaar(nieuw)
  return bewaar(k.ctx, k.user.id, nieuw, k.ctx.partij.tegen, w ? { winnaar: w === 'gelijk' ? null : w, gelijk: w === 'gelijk' } : null)
}

export async function damZet(potjeId: string, pad: number[]) {
  const { t } = await getT()
  const k = await voorbereiden(potjeId, 'dammen')
  if (!k) return { error: t('algemeen.lukteNiet') }
  const nieuw = M.doeZet(k.ctx.p.toestand as M.Dammen, pad)
  if (typeof nieuw === 'string') return { error: t('spellen.ongeldig') }
  const u = M.uitslag(nieuw)
  const einde = u ? { winnaar: u === 'gelijk' ? null : (u === 'w' ? nieuw.wit : nieuw.zwart), gelijk: u === 'gelijk' } : null
  return bewaar(k.ctx, k.user.id, nieuw, k.ctx.partij.tegen, einde)
}

export async function schaakZet(potjeId: string, van: string, naar: string) {
  const { t } = await getT()
  const k = await voorbereiden(potjeId, 'schaken')
  if (!k) return { error: t('algemeen.lukteNiet') }
  const nieuw = S.doeZet(k.ctx.p.toestand as S.Schaken, van, naar)
  if (typeof nieuw === 'string') return { error: t('spellen.ongeldig') }
  const st = S.status(nieuw)
  const einde = st.uitslag ? { winnaar: st.uitslag === 'gelijk' ? null : (st.uitslag === 'w' ? nieuw.wit : nieuw.zwart), gelijk: st.uitslag === 'gelijk' } : null
  return bewaar(k.ctx, k.user.id, nieuw, k.ctx.partij.tegen, einde)
}

/** Opgeven mag altijd, ook als het niet je beurt is */
export async function geefOp(potjeId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const ctx = await potjeVoor(potjeId, user.id)
  if (!ctx || ctx.p.status !== 'bezig') return { error: t('algemeen.lukteNiet') }
  return bewaar(ctx, user.id, ctx.p.toestand, null, { winnaar: ctx.partij.tegen, gelijk: false })
}

/** Laatste potje per spel tussen deze twee spelers */
export async function laadPotjes(doel: Doel) {
  const user = await ingelogd()
  if (!user) return []
  const partij = await partijVoor(doel, user.id)
  if (!partij) return []
  let zoek = createServiceClient().from('vriend_potjes').select(VELDEN)
  for (const [k, v] of Object.entries(partij.sleutel)) zoek = zoek.eq(k, v)
  const { data } = await zoek.order('aangemaakt_op', { ascending: false }).limit(12)
  const per = new Map<string, any>()
  for (const p of data || []) if (!per.has(p.soort)) per.set(p.soort, p)
  return Array.from(per.values()).map(p => ({
    id: p.id as string,
    soort: p.soort as Soort,
    toestand: p.toestand,
    mijnBeurt: p.beurt === user.id,
    klaar: p.status === 'klaar',
    gewonnen: p.winnaar === user.id,
    gelijk: !!p.gelijk,
    ik: user.id,
  }))
}
export type Potje = Awaited<ReturnType<typeof laadPotjes>>[number]
