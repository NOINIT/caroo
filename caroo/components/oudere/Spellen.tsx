'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { speelGeluid } from '@/lib/geluid'
import * as D from '@/lib/spellen/dobbelen'
import * as M from '@/lib/spellen/dammen'
import * as S from '@/lib/spellen/schaken'
import { laadPotjes, startPotje, dobbelGooi, dobbelKies, damZet, schaakZet, geefOp, type Potje, type Soort, type Doel } from '@/lib/acties/spellen'

type Keuze = 'woordketting' | Soort
const ICOON: Record<Keuze, string> = { woordketting: '🔤', dobbelen: '🎲', dammen: '⚫', schaken: '♟️' }

/**
 * Spellen kiezen en spelen. Werkt voor vrienden (met woordketting) en voor familie met de hoofdpersoon.
 */
export function Spellen({ doel, tegenNaam, woordketting }: {
  doel: Doel; tegenNaam: string; woordketting?: { node: React.ReactNode; mijnBeurt: boolean }
}) {
  const { t } = useT()
  const [gekozen, setGekozen] = useState<Keuze | null>(null)
  const [potjes, setPotjes] = useState<Potje[]>([])

  const sleutel = JSON.stringify(doel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const laad = useCallback(async () => setPotjes(await laadPotjes(doel)), [sleutel])
  useEffect(() => {
    laad()
    const timer = setInterval(laad, 15000)
    return () => clearInterval(timer)
  }, [laad])

  const woordBeurt = !!woordketting?.mijnBeurt
  const keuzes: Keuze[] = woordketting ? ['woordketting', 'dobbelen', 'dammen', 'schaken'] : ['dobbelen', 'dammen', 'schaken']
  const beurt = (k: Keuze) => (k === 'woordketting' ? woordBeurt : !!potjes.find(p => p.soort === k && !p.klaar && p.mijnBeurt))

  if (!gekozen) {
    return (
      <div>
        <h3 className="text-ou-xl font-bold text-caroo-donker mb-4">{t('spellen.kies')}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {keuzes.map(k => (
            <button key={k} onClick={() => { speelGeluid('tik'); setGekozen(k) }}
              className="caroo-card flex items-center gap-4 text-start py-5 hover:border-caroo-groen transition-colors">
              <span className="text-4xl" aria-hidden>{ICOON[k]}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-ou-xl font-bold text-caroo-donker">{t(`spellen.${k}`)}</span>
                <span className="block text-ou-base text-gray-600">{t(`spellen.uitleg.${k}`)}</span>
                {beurt(k) && <span className="block text-ou-base font-semibold text-caroo-groen">● {t('spellen.jouwBeurt')}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const terug = (
    <button onClick={() => { setGekozen(null); laad() }} className="text-ou-base text-caroo-groen font-semibold mb-3">
      <span className="inline-block rtl:rotate-180">←</span> {t('spellen.andere')}
    </button>
  )
  if (gekozen === 'woordketting') return <div>{terug}{woordketting?.node}</div>

  const potje = potjes.find(p => p.soort === gekozen) || null
  return (
    <div>
      {terug}
      <h3 className="text-ou-xl font-bold text-caroo-donker mb-3">{ICOON[gekozen]} {t(`spellen.${gekozen}`)}</h3>
      <Potjeskader soort={gekozen} potje={potje} doel={doel} tegenNaam={tegenNaam} vernieuw={laad} />
    </div>
  )
}

function Potjeskader({ soort, potje, doel, tegenNaam, vernieuw }: { soort: Soort; potje: Potje | null; doel: Doel; tegenNaam: string; vernieuw: () => Promise<void> }) {
  const { t } = useT()
  const [bezig, setBezig] = useState(false)
  const [opgeven, setOpgeven] = useState(false)

  async function begin() {
    setBezig(true)
    await startPotje(doel, soort)
    await vernieuw()
    setBezig(false)
  }

  if (!potje || potje.klaar) {
    return (
      <div className="space-y-4">
        {potje?.klaar && (
          <p className="caroo-card text-ou-xl font-bold text-center text-caroo-donker py-6">
            {potje.gelijk ? t('spellen.gelijk') : potje.gewonnen ? t('spellen.gewonnen') : t('spellen.verloren', { naam: tegenNaam })}
          </p>
        )}
        <button onClick={begin} disabled={bezig} className="btn-primary w-full text-ou-lg py-5">
          {potje ? t('spellen.nieuw') : t('spellen.start')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {soort === 'dobbelen' && <DobbelenBord potje={potje} vriendNaam={tegenNaam} vernieuw={vernieuw} />}
      {soort === 'dammen' && <DammenBord potje={potje} vriendNaam={tegenNaam} vernieuw={vernieuw} />}
      {soort === 'schaken' && <SchaakBord potje={potje} vriendNaam={tegenNaam} vernieuw={vernieuw} />}

      {!potje.mijnBeurt && <p className="caroo-card text-ou-lg text-caroo-donker">⏳ {t('spellen.beurtVan', { naam: tegenNaam })}</p>}

      <div className="pt-4">
        {!opgeven ? (
          <button onClick={() => setOpgeven(true)} className="text-ou-sm text-gray-600 underline">{t('spellen.opgeven')}</button>
        ) : (
          <div className="caroo-card">
            <p className="text-ou-base text-caroo-donker mb-3">{t('spellen.opgevenVraag')}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={async () => { await geefOp(potje.id); setOpgeven(false); await vernieuw() }} className="py-3 rounded-caroo border border-red-200 text-red-600 text-ou-base">{t('spellen.opgevenJa')}</button>
              <button onClick={() => setOpgeven(false)} className="btn-primary text-ou-base">{t('spellen.opgevenNee')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────── Dobbelen ───────── */

const OGEN: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }

function Steen({ waarde, vast, onClick, uit }: { waarde: number; vast: boolean; onClick?: () => void; uit?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={uit} aria-pressed={vast}
      className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 grid grid-cols-3 grid-rows-3 p-2 transition-transform
        ${vast ? 'bg-caroo-oranje-licht border-caroo-oranje -translate-y-1' : 'bg-white border-gray-300'} ${waarde ? '' : 'opacity-40'}`}
      aria-label={String(waarde || '')}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="flex items-center justify-center">
          {waarde > 0 && OGEN[waarde].includes(i) && <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-caroo-donker" />}
        </span>
      ))}
    </button>
  )
}

export function DobbelenBord({ potje, vriendNaam, vernieuw }: { potje: Potje; vriendNaam: string; vernieuw: () => Promise<void> }) {
  const { t } = useT()
  const s = potje.toestand as D.Dobbelen
  const ik = potje.ik
  const vriend = s.spelers.find(p => p !== ik)!
  const [vast, setVast] = useState<boolean[]>(s.vast)
  const [bezig, setBezig] = useState(false)
  useEffect(() => { setVast(s.vast) }, [s.worpen, s.vast])
  const magGooien = potje.mijnBeurt && s.worpen < 3
  const magKiezen = potje.mijnBeurt && s.worpen > 0

  async function gooi() {
    setBezig(true); speelGeluid('tik')
    await dobbelGooi(potje.id, vast)
    await vernieuw(); setBezig(false)
  }
  async function kies(vak: D.Vak) {
    setBezig(true); speelGeluid('succes')
    await dobbelKies(potje.id, vak)
    await vernieuw(); setBezig(false)
  }

  const mijn = D.totaal(s.kaart[ik] || {}), zijn = D.totaal(s.kaart[vriend] || {})
  return (
    <div className="space-y-4">
      {potje.mijnBeurt && (
        <div className="caroo-card space-y-4">
          <div className="flex gap-2 md:gap-3 justify-center">
            {s.stenen.map((w, i) => (
              <Steen key={i} waarde={w} vast={!!vast[i]} uit={!magGooien || s.worpen === 0 || bezig}
                onClick={() => setVast(v => v.map((x, j) => (j === i ? !x : x)))} />
            ))}
          </div>
          {s.worpen > 0 && s.worpen < 3 && <p className="text-ou-base text-gray-700 text-center">{t('spellen.dob.vasthouden')}</p>}
          {magGooien && (
            <button onClick={gooi} disabled={bezig} className="btn-primary w-full text-ou-lg py-4">
              🎲 {s.worpen === 0 ? t('spellen.dob.gooi') : t('spellen.dob.gooiNog', { aantal: 3 - s.worpen })}
            </button>
          )}
          {magKiezen && <p className="text-ou-base font-semibold text-caroo-donker text-center">{t('spellen.dob.kiesVak')}</p>}
        </div>
      )}

      <table className="w-full text-ou-base">
        <thead>
          <tr className="text-start">
            <th className="text-start py-2"></th>
            <th className="py-2 w-24 text-caroo-groen">{t('spellen.jij')}</th>
            <th className="py-2 w-24 truncate">{vriendNaam.split(' ')[0]}</th>
          </tr>
        </thead>
        <tbody>
          {D.VAKKEN.map((vak, i) => {
            const ikHeb = s.kaart[ik]?.[vak]
            return (
              <tr key={vak} className={`border-t border-gray-100 ${i === 6 ? 'border-t-4 border-gray-200' : ''}`}>
                <td className="py-2 text-caroo-donker">{t(`spellen.dob.vakken.${vak}`)}</td>
                <td className="py-1 text-center">
                  {ikHeb !== undefined ? <span className="font-bold">{ikHeb}</span>
                    : magKiezen ? (
                      <button onClick={() => kies(vak)} disabled={bezig}
                        className="w-16 py-2 rounded-caroo bg-caroo-groen-licht text-caroo-groen font-bold border-2 border-caroo-groen">
                        {D.punten(vak, s.stenen)}
                      </button>
                    ) : <span className="text-gray-300">·</span>}
                </td>
                <td className="py-2 text-center">{s.kaart[vriend]?.[vak] ?? <span className="text-gray-300">·</span>}</td>
              </tr>
            )
          })}
          <tr className="border-t-4 border-gray-200"><td className="py-2 text-gray-700">{t('spellen.dob.bonus')}</td><td className="text-center">{mijn.bonus}</td><td className="text-center">{zijn.bonus}</td></tr>
          <tr className="border-t border-gray-100 font-bold text-ou-lg"><td className="py-2">{t('spellen.dob.totaal')}</td><td className="text-center text-caroo-groen">{mijn.totaal}</td><td className="text-center">{zijn.totaal}</td></tr>
        </tbody>
      </table>
    </div>
  )
}

/* ───────── Dammen ───────── */

export function DammenBord({ potje, vernieuw }: { potje: Potje; vriendNaam: string; vernieuw: () => Promise<void> }) {
  const { t } = useT()
  const [stand, setStand] = useState(potje.toestand as M.Dammen)
  useEffect(() => { setStand(potje.toestand as M.Dammen) }, [potje.toestand])
  const mijnKleur: M.Kleur = stand.wit === potje.ik ? 'w' : 'z'
  const [gekozen, setGekozen] = useState<number | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const zetten = useMemo(() => (potje.mijnBeurt ? M.zetten(stand) : []), [stand, potje.mijnBeurt])
  const moetSlaan = zetten.some(z => z.geslagen.length > 0)
  const starts = new Set(zetten.map(z => z.pad[0]))
  const doelen = new Set(zetten.filter(z => z.pad[0] === gekozen).map(z => z.pad[z.pad.length - 1]))
  // Zwart ziet het bord omgedraaid, zodat je eigen stenen altijd onderaan staan
  const velden = Array.from({ length: 100 }, (_, i) => (mijnKleur === 'w' ? i : 99 - i))

  async function tik(i: number) {
    if (!potje.mijnBeurt) return
    if (starts.has(i)) { setGekozen(i); setFout(null); speelGeluid('tik'); return }
    if (gekozen === null || !doelen.has(i)) return
    const zet = zetten.find(z => z.pad[0] === gekozen && z.pad[z.pad.length - 1] === i)!
    const nieuw = M.doeZet(stand, zet.pad)
    if (typeof nieuw === 'string') return
    setStand(nieuw); setGekozen(null); speelGeluid('succes')
    const r = await damZet(potje.id, zet.pad)
    if ('error' in r && r.error) setFout(r.error)
    await vernieuw()
  }

  return (
    <div className="space-y-3">
      <p className="text-ou-base text-gray-700">{mijnKleur === 'w' ? t('spellen.dam.jijWit') : t('spellen.dam.jijZwart')}. {t('spellen.dam.uitleg')}</p>
      {potje.mijnBeurt && moetSlaan && <p className="text-ou-base font-semibold text-caroo-oranje-tekst">{t('spellen.dam.moetSlaan')}</p>}
      {fout && <p className="text-ou-sm text-red-600">{fout}</p>}
      <div className="grid w-full max-w-[600px] mx-auto aspect-square border-4 border-caroo-donker rounded-lg overflow-hidden" dir="ltr" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gridTemplateRows: 'repeat(10, minmax(0, 1fr))' }}>
        {velden.map(i => {
          const donker = M.isDonker(i)
          const stuk = stand.bord[i]
          const isStart = potje.mijnBeurt && starts.has(i)
          return (
            <button key={i} type="button" onClick={() => tik(i)} disabled={!donker}
              className={`relative flex items-center justify-center ${donker ? 'bg-[#8B5E3C]' : 'bg-[#F3E3C3]'}
                ${gekozen === i ? 'ring-4 ring-inset ring-caroo-oranje' : ''}`}>
              {doelen.has(i) && <span className="absolute w-1/3 h-1/3 rounded-full bg-caroo-oranje/80" />}
              {stuk && (
                <span className={`w-[78%] h-[78%] rounded-full flex items-center justify-center font-bold text-[clamp(10px,2.4vw,20px)]
                  ${stuk.toLowerCase() === 'w' ? 'bg-white text-caroo-donker border-2 border-gray-400' : 'bg-caroo-donker text-white border-2 border-black'}
                  ${isStart && moetSlaan ? 'ring-4 ring-caroo-oranje' : ''}`}>
                  {stuk === 'W' || stuk === 'Z' ? '♛' : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── Schaken ───────── */

const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }

export function SchaakBord({ potje, vernieuw }: { potje: Potje; vriendNaam: string; vernieuw: () => Promise<void> }) {
  const { t } = useT()
  const [stand, setStand] = useState(potje.toestand as S.Schaken)
  useEffect(() => { setStand(potje.toestand as S.Schaken) }, [potje.toestand])
  const ikWit = stand.wit === potje.ik
  const [gekozen, setGekozen] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const rijen = useMemo(() => S.bord(stand), [stand])
  const doelen = new Set(gekozen && potje.mijnBeurt ? S.doelen(stand, gekozen) : [])
  const st = S.status(stand)
  const mijnStuk = (stuk: string | null) => !!stuk && (ikWit ? stuk === stuk.toUpperCase() : stuk === stuk.toLowerCase())
  const lijst = ikWit ? rijen.flat() : rijen.flat().reverse()

  async function tik(veld: string, stuk: string | null) {
    if (!potje.mijnBeurt) return
    if (mijnStuk(stuk)) { setGekozen(veld); setFout(null); speelGeluid('tik'); return }
    if (!gekozen || !doelen.has(veld)) return
    const nieuw = S.doeZet(stand, gekozen, veld)
    if (typeof nieuw === 'string') return
    setStand(nieuw); setGekozen(null); speelGeluid('succes')
    const r = await schaakZet(potje.id, gekozen, veld)
    if ('error' in r && r.error) setFout(r.error)
    await vernieuw()
  }

  return (
    <div className="space-y-3">
      <p className="text-ou-base text-gray-700">{ikWit ? t('spellen.schaak.jijWit') : t('spellen.schaak.jijZwart')}. {t('spellen.schaak.uitleg')}</p>
      {st.schaak && !st.uitslag && <p className="text-ou-lg font-bold text-caroo-oranje-tekst">{t('spellen.schaak.schaak')}</p>}
      {fout && <p className="text-ou-sm text-red-600">{fout}</p>}
      <div className="grid w-full max-w-[600px] mx-auto aspect-square border-4 border-caroo-donker rounded-lg overflow-hidden" dir="ltr" style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gridTemplateRows: 'repeat(8, minmax(0, 1fr))' }}>
        {lijst.map(({ veld, stuk }) => {
          const c = veld.charCodeAt(0) - 97, r = Number(veld[1])
          const donker = (c + r) % 2 === 1
          const laatste = stand.laatste && (stand.laatste.van === veld || stand.laatste.naar === veld)
          return (
            <button key={veld} type="button" onClick={() => tik(veld, stuk)} aria-label={veld}
              className={`relative flex items-center justify-center ${donker ? 'bg-[#769656]' : 'bg-[#EEEED2]'}
                ${laatste ? 'after:absolute after:inset-0 after:bg-yellow-300/40' : ''}
                ${gekozen === veld ? 'ring-4 ring-inset ring-caroo-oranje' : ''}`}>
              {doelen.has(veld) && <span className="absolute w-1/3 h-1/3 rounded-full bg-caroo-oranje/70 z-10" />}
              {stuk && (
                <span className={`relative z-20 leading-none text-[clamp(26px,8vw,56px)] ${stuk === stuk.toUpperCase() ? 'text-white' : 'text-black'}`}
                  style={stuk === stuk.toUpperCase() ? { textShadow: '0 0 2px #000, 0 0 2px #000, 0 0 1px #000' } : undefined}>
                  {GLYPH[stuk.toLowerCase()]}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
