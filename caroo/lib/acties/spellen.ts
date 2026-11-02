'use server'

import crypto from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stuurMelding } from '@/lib/meldingen'
import { getT } from '@/lib/i18n/server'
import { ander, groepVan, persoonVan, vriendschapVan } from '@/lib/vrienden'
import * as D from '@/lib/spellen/dobbelen'
import * as M from '@/lib/spellen/dammen'
import * as S from '@/lib/spellen/schaken'

export type Soort = 'dobbelen' | 'dammen' | 'schaken'
const SOORTEN: Soort[] = ['dobbelen', 'dammen', 'schaken']

async function ingelogd() {
  const { data: { user } } = await createClient().auth.getUser()
  return user
}
async function naamVan(id: string) {
  const { data } = await createServiceClient().from('users').select('naam').eq('id', id).maybeSingle()
  return (data?.naam as string) || ''
}

/** Een eerlijke dobbelsteen: 1 tot en met 6 */
const steen = () => crypto.randomInt(1, 7)

/** Laad een potje en controleer dat deze gebruiker meespeelt */
async function potjeVoor(potjeId: string, userId: string) {
  const { data: p } = await createServiceClient().from('vriend_potjes')
    .select('id, vriendschap_id, soort, toestand, beurt, status, bijgewerkt_op').eq('id', potjeId).maybeSingle()
  if (!p) return null
  const v = await vriendschapVan(p.vriendschap_id, userId)
  if (!v) return null
  return { p, ...v }
}

export async function startPotje(vriendschapId: string, soort: Soort) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user || !SOORTEN.includes(soort)) return { error: t('algemeen.lukteNiet') }
  const gevonden = await vriendschapVan(vriendschapId, user.id)
  if (!gevonden) return { error: t('algemeen.lukteNiet') }
  const service = createServiceClient()
  const { data: al } = await service.from('vriend_potjes').select('id').eq('vriendschap_id', vriendschapId).eq('soort', soort).eq('status', 'bezig').maybeSingle()
  if (al) return { id: al.id as string }

  const vriend = persoonVan(gevonden.v, ander(gevonden.kant))
  // Wie begint, speelt met wit en zet als eerste
  const toestand = soort === 'dobbelen' ? D.nieuwDobbelen(user.id, vriend)
    : soort === 'dammen' ? M.nieuwDammen(user.id, vriend) : S.nieuwSchaken(user.id, vriend)
  const { data, error } = await service.from('vriend_potjes')
    .insert({ vriendschap_id: vriendschapId, soort, toestand, beurt: user.id }).select('id').single()
  if (error || !data) return { error: t('algemeen.lukteNiet') }
  const naam = await naamVan(user.id)
  await stuurMelding([vriend], tt => ({
    titel: tt('spellen.meldingStart', { naam, spel: tt(`spellen.${soort}`) }), tekst: tt('spellen.meldingStartTekst'),
    url: `/oudere/${groepVan(gevonden.v, ander(gevonden.kant))}`, tag: `potje-${data.id}`,
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

  const vriend = persoonVan(ctx.v, ander(ctx.kant))
  if (einde || volgende === vriend) {
    const naam = await naamVan(userId)
    const spel = (tt: any) => tt(`spellen.${ctx.p.soort}`)
    await stuurMelding([vriend], tt => ({
      titel: einde
        ? (einde.gelijk ? tt('spellen.meldingGelijk', { spel: spel(tt), naam }) : einde.winnaar === vriend ? tt('spellen.meldingGewonnen', { spel: spel(tt), naam }) : tt('spellen.meldingVerloren', { spel: spel(tt), naam }))
        : tt('spellen.meldingBeurt', { spel: spel(tt), naam }),
      tekst: tt('spellen.meldingStartTekst'),
      url: `/oudere/${groepVan(ctx.v, ander(ctx.kant))}`, tag: `potje-${ctx.p.id}`,
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
  const vriend = persoonVan(k.ctx.v, ander(k.ctx.kant))
  return bewaar(k.ctx, k.user.id, nieuw, vriend, w ? { winnaar: w === 'gelijk' ? null : w, gelijk: w === 'gelijk' } : null)
}

export async function damZet(potjeId: string, pad: number[]) {
  const { t } = await getT()
  const k = await voorbereiden(potjeId, 'dammen')
  if (!k) return { error: t('algemeen.lukteNiet') }
  const oud = k.ctx.p.toestand as M.Dammen
  const nieuw = M.doeZet(oud, pad)
  if (typeof nieuw === 'string') return { error: t('spellen.ongeldig') }
  const u = M.uitslag(nieuw)
  const vriend = persoonVan(k.ctx.v, ander(k.ctx.kant))
  const einde = u ? { winnaar: u === 'gelijk' ? null : (u === 'w' ? nieuw.wit : nieuw.zwart), gelijk: u === 'gelijk' } : null
  return bewaar(k.ctx, k.user.id, nieuw, vriend, einde)
}

export async function schaakZet(potjeId: string, van: string, naar: string) {
  const { t } = await getT()
  const k = await voorbereiden(potjeId, 'schaken')
  if (!k) return { error: t('algemeen.lukteNiet') }
  const nieuw = S.doeZet(k.ctx.p.toestand as S.Schaken, van, naar)
  if (typeof nieuw === 'string') return { error: t('spellen.ongeldig') }
  const st = S.status(nieuw)
  const vriend = persoonVan(k.ctx.v, ander(k.ctx.kant))
  const einde = st.uitslag ? { winnaar: st.uitslag === 'gelijk' ? null : (st.uitslag === 'w' ? nieuw.wit : nieuw.zwart), gelijk: st.uitslag === 'gelijk' } : null
  return bewaar(k.ctx, k.user.id, nieuw, vriend, einde)
}

/** Opgeven mag altijd, ook als het niet je beurt is */
export async function geefOp(potjeId: string) {
  const { t } = await getT()
  const user = await ingelogd()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const ctx = await potjeVoor(potjeId, user.id)
  if (!ctx || ctx.p.status !== 'bezig') return { error: t('algemeen.lukteNiet') }
  const vriend = persoonVan(ctx.v, ander(ctx.kant))
  return bewaar(ctx, user.id, ctx.p.toestand, null, { winnaar: vriend, gelijk: false })
}

/** Laatste potje per spel voor deze vriendschap */
export async function laadPotjes(vriendschapId: string) {
  const user = await ingelogd()
  if (!user || !(await vriendschapVan(vriendschapId, user.id))) return []
  const { data } = await createServiceClient().from('vriend_potjes')
    .select('id, soort, toestand, beurt, status, winnaar, gelijk, bijgewerkt_op')
    .eq('vriendschap_id', vriendschapId).order('aangemaakt_op', { ascending: false }).limit(12)
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
