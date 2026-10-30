'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { speelGeluid } from '@/lib/geluid'
import { hoofdletter } from '@/lib/i18n/vertaal'
import type { VriendKaart, VriendenStatus } from '@/lib/vrienden'
import {
  laadVriend, stuurBericht, stuurVriendFoto, legWoord, nieuwSpel,
  stelSamenVoor, beantwoordSamen, trekSamenIn, stopMetVriend, type VriendDetail,
  beantwoordVriendschap, vraagVriendAan, trekVriendVerzoekIn, maakEigenUitnodiging,
} from '@/lib/acties/vrienden'

type Scherm = 'praten' | 'spel' | 'samen'

function Rondje({ naam, groot }: { naam: string; groot?: boolean }) {
  return (
    <span className={`flex-shrink-0 rounded-full bg-caroo-oranje-licht text-caroo-donker font-bold flex items-center justify-center
      ${groot ? 'w-16 h-16 text-3xl' : 'w-14 h-14 text-2xl'}`} aria-hidden>
      {(naam || '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Vrienden({ vrienden, status, groepId }: { vrienden: VriendKaart[]; status: VriendenStatus; groepId: string }) {
  const { t } = useT()
  const router = useRouter()
  const [open, setOpen] = useState<VriendKaart | null>(null)
  const [bezig, setBezig] = useState(false)
  const totaal = vrienden.length + status.vragen.length + status.wachten.length + status.verzoeken.length

  async function antwoord(id: string, ja: boolean) {
    setBezig(true)
    await beantwoordVriendschap(id, ja)
    if (ja) speelGeluid('succes')
    setBezig(false)
    router.refresh()
  }

  if (open) {
    return (
      <VriendScherm
        kaart={open}
        terug={() => { setOpen(null); router.refresh() }}
        gestopt={() => { setOpen(null); router.refresh() }}
      />
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 space-y-6">
      <h2 className="text-ou-xl font-bold text-caroo-donker">{t('vrienden.titel')}</h2>

      {/* Iemand wil vrienden worden: de hoofdpersoon kiest zelf */}
      {status.vragen.map(v => (
        <div key={v.id} className="caroo-card border-s-4 border-caroo-oranje py-5">
          <div className="flex items-center gap-4 mb-4">
            <Rondje naam={v.naam} />
            <p className="text-ou-xl font-bold text-caroo-donker">{t('vrienden.vraagTekst', { naam: v.naam })}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={bezig} onClick={() => antwoord(v.id, true)} className="btn-primary text-ou-base py-4">{t('vrienden.vraagJa')}</button>
            <button disabled={bezig} onClick={() => antwoord(v.id, false)} className="btn-secondary text-ou-base py-4">{t('vrienden.vraagNee')}</button>
          </div>
        </div>
      ))}

      {vrienden.length === 0 && status.vragen.length === 0 && (
        <p className="text-ou-lg text-gray-600">{t('vrienden.geenVrienden')}</p>
      )}

      {vrienden.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {vrienden.map(v => (
            <button
              key={v.id}
              onClick={() => { speelGeluid('tik'); setOpen(v) }}
              className="caroo-card flex items-center gap-4 text-start hover:border-caroo-groen transition-colors py-5"
            >
              <Rondje naam={v.naam} />
              <span className="flex-1 min-w-0">
                <span className="block text-ou-xl font-bold text-caroo-donker truncate">{v.naam}</span>
                {v.vraag && <span className="block text-ou-base text-caroo-oranje-tekst font-semibold">☕ {t('vrienden.vraagt', { naam: v.naam })}</span>}
                {!v.vraag && v.ongelezen > 0 && <span className="block text-ou-base text-caroo-oranje-tekst font-semibold">💬 {t('vrienden.nieuwBericht')}</span>}
                {!v.vraag && !v.ongelezen && v.jouwBeurt && <span className="block text-ou-base text-caroo-groen font-semibold">🔤 {t('vrienden.jouwBeurt')}</span>}
              </span>
              <span className="text-3xl text-gray-400 rtl:rotate-180" aria-hidden>›</span>
            </button>
          ))}
        </div>
      )}

      {/* Wat nog loopt */}
      {(status.wachten.length > 0 || status.verzoeken.length > 0) && (
        <div className="space-y-2">
          {status.wachten.map(v => (
            <p key={v.id} className="caroo-card text-ou-base text-gray-700">⏳ {t('vrienden.wachtOp', { naam: v.naam })}</p>
          ))}
          {status.verzoeken.map(v => (
            <div key={v.id} className="caroo-card flex items-center justify-between gap-3">
              <p className="text-ou-base text-gray-700">
                <strong className="text-caroo-donker">{v.vriendNaam}</strong>
                <span className="block">⏳ {v.regeltNaam ? t('vrienden.regeltHet', { naam: v.regeltNaam }) : t('vrienden.verzoekVerstuurd')}</span>
              </p>
              <button onClick={async () => { await trekVriendVerzoekIn(v.id); router.refresh() }} className="text-ou-sm text-gray-600 underline flex-shrink-0">{t('vrienden.intrekken')}</button>
            </div>
          ))}
        </div>
      )}

      {totaal < 3 ? (
        <VriendToevoegen groepId={groepId} zelf={status.zelf} klaar={() => router.refresh()} />
      ) : (
        <p className="text-ou-base text-gray-600">{t('vrienden.maxVrienden')}</p>
      )}
    </div>
  )
}

function VriendToevoegen({ groepId, zelf, klaar }: { groepId: string; zelf: boolean; klaar: () => void }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [naam, setNaam] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [link, setLink] = useState<{ url: string; naam: string } | null>(null)
  const [gekopieerd, setGekopieerd] = useState(false)

  async function vraag(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim()) return
    setBezig(true); setFout(null)
    const r = await vraagVriendAan(groepId, naam)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    speelGeluid('succes')
    setNaam(''); setOpen(false)
    klaar()
  }

  async function maakLink() {
    setBezig(true); setFout(null)
    const r = await maakEigenUitnodiging(groepId)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    if ('url' in r && r.url) setLink({ url: r.url, naam: r.naam })
  }

  if (!open) {
    return (
      <button onClick={() => { speelGeluid('tik'); setOpen(true) }} className="btn-primary w-full text-ou-lg py-5">
        {t('vrienden.toevoegen')}
      </button>
    )
  }

  if (zelf) {
    const tekst = link ? `${t('vrienden.deelTekst')} ${link.url}` : ''
    return (
      <div className="caroo-card space-y-4">
        <p className="text-ou-lg font-bold text-caroo-donker">{t('vrienden.toevoegen')}</p>
        {fout && <p className="text-ou-sm text-red-600">{fout}</p>}
        {!link ? (
          <button onClick={maakLink} disabled={bezig} className="btn-primary w-full text-ou-base py-4">{t('vrienden.uitnodigingMaken')}</button>
        ) : (
          <>
            <p className="text-ou-base text-gray-700">{t('vrienden.uitnodigingUitleg')}</p>
            <a href={`https://wa.me/?text=${encodeURIComponent(tekst)}`} target="_blank" rel="noopener noreferrer" className="btn-primary w-full block text-center text-ou-base py-4">{t('vrienden.delen')}</a>
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(link.url); setGekopieerd(true) } catch {} }}
              className="btn-secondary w-full text-ou-base py-4"
            >{gekopieerd ? `✓ ${t('vrienden.gekopieerd')}` : t('vrienden.kopieer')}</button>
          </>
        )}
        <button onClick={() => { setOpen(false); setLink(null); klaar() }} className="text-ou-sm text-gray-600 underline">{t('algemeen.terug')}</button>
      </div>
    )
  }

  return (
    <form onSubmit={vraag} className="caroo-card space-y-4">
      <label htmlFor="vriend-naam" className="block text-ou-lg font-bold text-caroo-donker">{t('vrienden.toevoegenVraag')}</label>
      <p className="text-ou-base text-gray-700">{t('vrienden.toevoegenUitleg')}</p>
      <input id="vriend-naam" value={naam} onChange={e => setNaam(e.target.value)} maxLength={60}
        placeholder={t('vrienden.toevoegenPlaceholder')} className="input-field text-ou-lg" />
      {fout && <p className="text-ou-sm text-red-600">{fout}</p>}
      <div className="grid grid-cols-3 gap-3">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-ou-base py-4">{t('algemeen.annuleren')}</button>
        <button type="submit" disabled={bezig || !naam.trim()} className="btn-primary col-span-2 text-ou-base py-4">{t('vrienden.toevoegenKnop')}</button>
      </div>
    </form>
  )
}

function VriendScherm({ kaart, terug, gestopt }: { kaart: VriendKaart; terug: () => void; gestopt: () => void }) {
  const { t } = useT()
  const [detail, setDetail] = useState<VriendDetail | null>(null)
  const [scherm, setScherm] = useState<Scherm>(kaart.vraag ? 'samen' : kaart.jouwBeurt && !kaart.ongelezen ? 'spel' : 'praten')
  const [stopVraag, setStopVraag] = useState(false)

  const laad = useCallback(async () => {
    const d = await laadVriend(kaart.id)
    if (d) setDetail(d)
  }, [kaart.id])

  useEffect(() => {
    laad()
    const timer = setInterval(laad, 20000)
    return () => clearInterval(timer)
  }, [laad])

  async function stop() {
    await stopMetVriend(kaart.id)
    gestopt()
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6">
      <button onClick={terug} className="text-ou-base text-caroo-groen font-semibold mb-3">
        <span className="inline-block rtl:rotate-180">←</span> {t('vrienden.titel')}
      </button>
      <div className="flex items-center gap-4 mb-4">
        <Rondje naam={kaart.naam} groot />
        <h2 className="text-ou-2xl font-bold text-caroo-donker">{kaart.naam}</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5" role="tablist">
        {(['praten', 'spel', 'samen'] as Scherm[]).map(s => (
          <button
            key={s}
            role="tab"
            aria-selected={scherm === s}
            onClick={() => { speelGeluid('tik'); setScherm(s) }}
            className={`py-3 rounded-caroo text-ou-base font-semibold border-2 transition-colors
              ${scherm === s ? 'bg-caroo-groen text-white border-caroo-groen' : 'bg-white text-caroo-donker border-gray-200'}`}
          >
            {t(s === 'praten' ? 'vrienden.tabPraten' : s === 'spel' ? 'vrienden.tabSpel' : 'vrienden.tabSamen')}
          </button>
        ))}
      </div>

      {!detail ? (
        <p className="text-ou-base text-gray-600">{t('algemeen.evenGeduld')}</p>
      ) : scherm === 'praten' ? (
        <Praten detail={detail} opnieuw={laad} />
      ) : scherm === 'spel' ? (
        <Spel detail={detail} opnieuw={laad} />
      ) : (
        <Samen detail={detail} opnieuw={laad} />
      )}

      <div className="mt-10 pt-6 border-t border-gray-100">
        {!stopVraag ? (
          <button onClick={() => setStopVraag(true)} className="text-ou-sm text-gray-600 underline">
            {t('vrienden.stop', { naam: kaart.naam })}
          </button>
        ) : (
          <div className="caroo-card">
            <p className="text-ou-base text-caroo-donker mb-3">{t('vrienden.stopVraag', { naam: kaart.naam })}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={stop} className="py-3 rounded-caroo border border-red-200 text-red-600 text-ou-base">{t('vrienden.stopJa')}</button>
              <button onClick={() => setStopVraag(false)} className="btn-primary text-ou-base">{t('vrienden.stopNee')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────── Praten ───────── */

async function verklein(bestand: File): Promise<Blob> {
  const url = URL.createObjectURL(bestand)
  try {
    const img = await new Promise<HTMLImageElement>((ok, fout) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = fout; i.src = url
    })
    const max = 1280
    const schaal = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * schaal)
    canvas.height = Math.round(img.height * schaal)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((ok, fout) => canvas.toBlob(b => (b ? ok(b) : fout()), 'image/jpeg', 0.82))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function Praten({ detail, opnieuw }: { detail: VriendDetail; opnieuw: () => Promise<void> }) {
  const { t, tijd, datum } = useT()
  const [tekst, setTekst] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const fotoKiezer = useRef<HTMLInputElement>(null)
  const einde = useRef<HTMLDivElement>(null)

  useEffect(() => { einde.current?.scrollIntoView({ block: 'nearest' }) }, [detail.berichten.length])

  async function stuur() {
    if (!tekst.trim()) return
    setBezig(true); setFout(null)
    const r = await stuurBericht(detail.id, tekst)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    speelGeluid('succes')
    setTekst('')
    await opnieuw()
  }

  async function foto(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0]
    e.target.value = ''
    if (!bestand) return
    setBezig(true); setFout(null)
    try {
      const klein = await verklein(bestand)
      const form = new FormData()
      form.append('foto', klein, 'foto.jpg')
      const r = await stuurVriendFoto(detail.id, form)
      if ('error' in r && r.error) setFout(r.error)
      else { speelGeluid('succes'); await opnieuw() }
    } catch {
      setFout(t('algemeen.lukteNiet'))
    }
    setBezig(false)
  }

  const vandaag = new Date().toDateString()
  return (
    <div>
      <div className="space-y-3 mb-5">
        {detail.berichten.length === 0 && (
          <p className="text-ou-lg text-gray-600 text-center py-6">{t('vrienden.geenBerichten', { naam: detail.vriendNaam })}</p>
        )}
        {detail.berichten.map(b => (
          <div key={b.id} className={`flex ${b.vanMij ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-caroo px-4 py-3 ${b.vanMij ? 'bg-caroo-groen-licht' : 'bg-caroo-oranje-licht'}`}>
              {b.foto && <img src={b.foto} alt="" className="rounded-caroo max-h-80 w-auto mb-1" />}
              {b.tekst && <p className="text-ou-lg text-caroo-donker whitespace-pre-line break-words">{b.tekst}</p>}
              <p className="text-ou-sm text-gray-600 mt-1">
                {new Date(b.op).toDateString() === vandaag ? tijd(b.op) : `${datum(b.op, { weekday: 'short', day: 'numeric', month: 'short' })} ${tijd(b.op)}`}
              </p>
            </div>
          </div>
        ))}
        <div ref={einde} />
      </div>

      {fout && <p className="text-ou-sm text-red-600 mb-2">{fout}</p>}
      <textarea
        value={tekst}
        onChange={e => setTekst(e.target.value)}
        maxLength={500}
        placeholder={t('vrienden.typHier', { naam: detail.vriendNaam })}
        className="input-field text-ou-lg h-28 resize-none mb-3"
      />
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => fotoKiezer.current?.click()} disabled={bezig} className="btn-secondary text-ou-base py-4">
          {bezig ? t('vrienden.fotoBezig') : t('vrienden.stuurFoto')}
        </button>
        <button onClick={stuur} disabled={bezig || !tekst.trim()} className="btn-primary text-ou-base py-4">{t('vrienden.stuur')}</button>
      </div>
      <input ref={fotoKiezer} type="file" accept="image/*" className="hidden" onChange={foto} />
    </div>
  )
}

/* ───────── Woordketting ───────── */

function laatste(w: string) {
  const l = Array.from(w.normalize('NFD').replace(new RegExp('\\p{M}', 'gu'), ''))
  return (l[l.length - 1] || '').toUpperCase()
}

export function Spel({ detail, opnieuw }: { detail: VriendDetail; opnieuw: () => Promise<void> }) {
  const { t } = useT()
  const [woord, setWoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const woorden = detail.spel?.woorden || []
  const vorige = woorden[woorden.length - 1]
  const mijnBeurt = !detail.spel || woorden.length === 0 || detail.spel.mijnBeurt
  const letter = vorige ? laatste(vorige.w) : null

  async function leg(e: React.FormEvent) {
    e.preventDefault()
    if (!woord.trim()) return
    setBezig(true); setFout(null)
    const r = await legWoord(detail.id, woord)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    speelGeluid('succes')
    setWoord('')
    await opnieuw()
  }

  async function opnieuwBeginnen() {
    await nieuwSpel(detail.id)
    setFout(null)
    await opnieuw()
  }

  return (
    <div>
      <h3 className="text-ou-xl font-bold text-caroo-donker">{t('vrienden.spelTitel')}</h3>
      <p className="text-ou-base text-gray-600 mb-4">{t('vrienden.spelUitleg')}</p>

      {woorden.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5" aria-label={t('vrienden.spelAantal', { aantal: woorden.length })}>
          {woorden.slice(-8).map((x, i) => (
            <span key={i} className={`px-3 py-2 rounded-caroo text-ou-lg font-bold tracking-wide
              ${x.vanMij ? 'bg-caroo-groen-licht text-caroo-groen' : 'bg-caroo-oranje-licht text-caroo-donker'}`}>
              {x.w.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {mijnBeurt ? (
        <form onSubmit={leg}>
          <p className="text-ou-lg text-caroo-donker mb-2">
            {letter ? <>{t('vrienden.spelBegintMet')} <strong className="text-ou-2xl text-caroo-groen">{letter}</strong></> : t('vrienden.spelEersteWoord')}
          </p>
          <input
            value={woord}
            onChange={e => setWoord(e.target.value)}
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            className="input-field text-ou-xl uppercase tracking-wide mb-3"
            aria-label={letter ? `${t('vrienden.spelBegintMet')} ${letter}` : t('vrienden.spelEersteWoord')}
          />
          {fout && <p className="text-ou-sm text-red-600 mb-2">{fout}</p>}
          <button type="submit" disabled={bezig || !woord.trim()} className="btn-primary w-full text-ou-base py-4">{t('vrienden.spelLeg')}</button>
        </form>
      ) : (
        <p className="caroo-card text-ou-lg text-caroo-donker">⏳ {t('vrienden.spelWachten', { naam: detail.vriendNaam })}</p>
      )}

      {woorden.length > 0 && (
        <button onClick={opnieuwBeginnen} className="mt-6 text-ou-sm text-gray-600 underline">{t('vrienden.spelOpnieuw')}</button>
      )}
    </div>
  )
}

/* ───────── Samen iets doen ───────── */

function dagenVooruit(n: number) {
  const lijst: string[] = []
  const nu = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + i, 12)
    lijst.push(d.toLocaleDateString('sv-SE'))
  }
  return lijst
}

function Keuze({ actief, onClick, children }: { actief: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => { speelGeluid('tik'); onClick() }}
      aria-pressed={actief}
      className={`py-3 px-3 rounded-caroo text-ou-base font-semibold border-2 text-start transition-colors
        ${actief ? 'bg-caroo-groen text-white border-caroo-groen' : 'bg-white text-caroo-donker border-gray-200'}`}
    >
      {children}
    </button>
  )
}

export function Samen({ detail, opnieuw }: { detail: VriendDetail; opnieuw: () => Promise<void> }) {
  const { t, datum } = useT()
  const [nieuw, setNieuw] = useState(false)
  const [wat, setWat] = useState<string | null>(null)
  const [eigen, setEigen] = useState('')
  const [waar, setWaar] = useState<'bijMij' | 'bijVriend' | 'ergens' | null>(null)
  const [dag, setDag] = useState<string | null>(null)
  const [dagdeel, setDagdeel] = useState<string | null>(null)
  const [vervoer, setVervoer] = useState<boolean | null>(null)
  const [antwoordVoor, setAntwoordVoor] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const dagen = dagenVooruit(7)
  const vandaagS = dagen[0], morgenS = dagen[1]

  const dagNaam = (d: string) => d === vandaagS ? t('vrienden.vandaag') : d === morgenS ? t('vrienden.morgen')
    : datum(d + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'short' })
  const wanneer = (d: string, deel: string) => t(`vrienden.dagdeelOp.${deel}` as any, { dag: dagNaam(d).toLowerCase() })
  const watLabel = (w: string, e: string | null) => (w === 'eigen' && e ? `✏️ ${e}` : t(`vrienden.wat.${w}` as any))
  const waarLabel = (w: string) => w === 'bijMij' ? t('vrienden.bijMij') : w === 'bijVriend' ? t('vrienden.bijVriend', { naam: detail.vriendNaam }) : ''

  // Vraag om vervoer alleen als de familie "Dat verschilt" koos en het niet bij mij thuis is
  const vraagVervoer = (w: string | null) => detail.mijnVervoer === 'verschilt' && w !== null && w !== 'bijMij'
  const klaar = wat && (wat !== 'eigen' || eigen.trim()) && waar && dag && dagdeel && (!vraagVervoer(waar) || vervoer !== null)

  async function verstuur() {
    if (!klaar) return
    setBezig(true); setFout(null)
    const r = await stelSamenVoor(detail.id, { wat: wat!, eigenTekst: eigen, waar: waar!, dag: dag!, dagdeel: dagdeel!, vervoer })
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    speelGeluid('succes')
    setNieuw(false); setWat(null); setEigen(''); setWaar(null); setDag(null); setDagdeel(null); setVervoer(null)
    await opnieuw()
  }

  async function antwoord(id: string, ja: boolean, metVervoer: boolean | null) {
    setBezig(true); setFout(null)
    const r = await beantwoordSamen(id, ja, metVervoer)
    setBezig(false)
    setAntwoordVoor(null)
    if ('error' in r && r.error) { setFout(r.error); return }
    if (ja) speelGeluid('succes')
    await opnieuw()
  }

  return (
    <div className="space-y-4">
      {fout && <p className="text-ou-sm text-red-600">{fout}</p>}

      {detail.afspraken.map(a => (
        <div key={a.id} className={`caroo-card border-s-4 ${a.status === 'ja' ? 'border-caroo-groen' : 'border-caroo-oranje'}`}>
          {a.status === 'ja' && <p className="text-ou-base font-bold text-caroo-groen">{t('vrienden.gepland')}</p>}
          {a.status === 'gevraagd' && !a.vanMij && <p className="text-ou-base font-bold text-caroo-donker">{t('vrienden.vraagVan', { naam: detail.vriendNaam })}</p>}
          <p className="text-ou-xl font-bold text-caroo-donker">{watLabel(a.wat, a.eigenTekst)}</p>
          <p className="text-ou-lg text-caroo-donker">
            {wanneer(a.dag, a.dagdeel)}{waarLabel(a.waar) ? `, ${waarLabel(a.waar)}` : ''}
          </p>

          {a.status === 'ja' && a.ikVervoer && (
            <p className="text-ou-base text-gray-700 mt-2">🚗 {a.brengtMij ? t('vrienden.brengt', { naam: a.brengtMij }) : t('vrienden.familieRegelt')}</p>
          )}

          {a.status === 'gevraagd' && a.vanMij && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-ou-base text-gray-600">{t('vrienden.jijVroeg', { naam: detail.vriendNaam })}</p>
              <button onClick={async () => { await trekSamenIn(a.id); await opnieuw() }} className="text-ou-sm text-gray-600 underline">{t('vrienden.intrekken')}</button>
            </div>
          )}

          {a.status === 'gevraagd' && !a.vanMij && antwoordVoor !== a.id && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                disabled={bezig}
                onClick={() => (detail.mijnVervoer === 'verschilt' && a.waar !== 'bijMij' ? setAntwoordVoor(a.id) : antwoord(a.id, true, null))}
                className="btn-primary text-ou-base py-4"
              >{t('vrienden.antwoordJa')}</button>
              <button disabled={bezig} onClick={() => antwoord(a.id, false, null)} className="btn-secondary text-ou-base py-4">{t('vrienden.antwoordNee')}</button>
            </div>
          )}
          {antwoordVoor === a.id && (
            <div className="mt-3">
              <p className="text-ou-lg text-caroo-donker mb-2">{t('vrienden.brengVraag')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button disabled={bezig} onClick={() => antwoord(a.id, true, true)} className="btn-primary text-ou-base py-4">{t('vrienden.brengJa')}</button>
                <button disabled={bezig} onClick={() => antwoord(a.id, true, false)} className="btn-secondary text-ou-base py-4">{t('vrienden.brengNee')}</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {!nieuw ? (
        <button onClick={() => setNieuw(true)} className="btn-primary w-full text-ou-lg py-5">
          {detail.afspraken.length ? t('vrienden.nieuweVraag') : t('vrienden.samenVraag', { naam: detail.vriendNaam })}
        </button>
      ) : (
        <div className="caroo-card space-y-5">
          <fieldset>
            <legend className="text-ou-lg font-bold text-caroo-donker mb-2">{t('vrienden.samenVraag', { naam: detail.vriendNaam })}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['koffie', 'wandelen', 'boodschappen', 'eigen'] as const).map(w => (
                <Keuze key={w} actief={wat === w} onClick={() => setWat(w)}>{t(`vrienden.wat.${w}`)}</Keuze>
              ))}
            </div>
            {wat === 'eigen' && (
              <input value={eigen} onChange={e => setEigen(e.target.value)} maxLength={80}
                placeholder={t('vrienden.eigenPlaceholder')} className="input-field text-ou-lg mt-3" />
            )}
          </fieldset>

          <fieldset>
            <legend className="text-ou-lg font-bold text-caroo-donker mb-2">{t('vrienden.waarVraag')}</legend>
            <div className="grid gap-2 md:grid-cols-3">
              <Keuze actief={waar === 'bijMij'} onClick={() => { setWaar('bijMij'); setVervoer(null) }}>{t('vrienden.waarMij')}</Keuze>
              <Keuze actief={waar === 'bijVriend'} onClick={() => setWaar('bijVriend')}>{t('vrienden.waarJou', { naam: detail.vriendNaam })}</Keuze>
              <Keuze actief={waar === 'ergens'} onClick={() => setWaar('ergens')}>{t('vrienden.waarErgens')}</Keuze>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-ou-lg font-bold text-caroo-donker mb-2">{t('vrienden.dagVraag')}</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {dagen.map(d => <Keuze key={d} actief={dag === d} onClick={() => setDag(d)}>{hoofdletter(dagNaam(d))}</Keuze>)}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-ou-lg font-bold text-caroo-donker mb-2">{t('vrienden.dagdeelVraag')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['ochtend', 'middag', 'avond'] as const).map(d => (
                <Keuze key={d} actief={dagdeel === d} onClick={() => setDagdeel(d)}>{t(`vrienden.dagdeel.${d}`)}</Keuze>
              ))}
            </div>
          </fieldset>

          {vraagVervoer(waar) && (
            <fieldset>
              <legend className="text-ou-lg font-bold text-caroo-donker mb-2">{t('vrienden.brengVraag')}</legend>
              <div className="grid grid-cols-2 gap-2">
                <Keuze actief={vervoer === true} onClick={() => setVervoer(true)}>{t('vrienden.brengJa')}</Keuze>
                <Keuze actief={vervoer === false} onClick={() => setVervoer(false)}>{t('vrienden.brengNee')}</Keuze>
              </div>
            </fieldset>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setNieuw(false)} className="btn-secondary text-ou-base py-4">{t('algemeen.annuleren')}</button>
            <button onClick={verstuur} disabled={!klaar || bezig} className="btn-primary col-span-2 text-ou-base py-4">
              {t('vrienden.versturen', { naam: detail.vriendNaam })}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
