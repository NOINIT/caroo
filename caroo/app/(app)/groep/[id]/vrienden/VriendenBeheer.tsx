'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { maakVriendUitnodiging, trekUitnodigingIn, wijzigVervoer, verbreekVriendschap, zetVriendenZelf } from '@/lib/acties/vrienden'
import type { VriendVerzoek } from '@/lib/vrienden'

type Vervoer = 'zelf' | 'nodig' | 'verschilt'
interface Hoofdpersoon { id: string; naam: string }
interface Actief { id: string; hoofdpersoon: string; vriendNaam: string; vervoer: Vervoer; wacht: boolean }
interface Open { id: string; hoofdpersoon: string; verloopt: string }

function VervoerKeuze({ waarde, onChange, naam }: { waarde: Vervoer; onChange: (v: Vervoer) => void; naam: string }) {
  const { t } = useT()
  return (
    <fieldset>
      <legend className="input-label">{t('vrienden.familie.vervoerVraag', { naam })}</legend>
      <div className="grid grid-cols-3 gap-2">
        {(['zelf', 'nodig', 'verschilt'] as Vervoer[]).map(v => (
          <button
            key={v}
            type="button"
            aria-pressed={waarde === v}
            onClick={() => onChange(v)}
            className={`py-2 px-2 rounded-caroo text-sm font-medium border transition-colors
              ${waarde === v ? 'bg-caroo-groen text-white border-caroo-groen' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            {t(`vrienden.familie.vervoer.${v}`)}
          </button>
        ))}
      </div>
      {waarde === 'verschilt' && <p className="text-xs text-gray-600 mt-2">{t('vrienden.familie.vervoerUitleg', { naam })}</p>}
    </fieldset>
  )
}

export function VriendenBeheer({ groepId, hoofdpersonen, actief, open, zelf, verzoek, isBeheerder, max }: {
  groepId: string; hoofdpersonen: Hoofdpersoon[]; actief: Actief[]; open: Open[]; zelf: string[]
  verzoek: VriendVerzoek | null; isBeheerder: boolean; max: number
}) {
  return (
    <div className="space-y-8">
      {hoofdpersonen.map(h => (
        <Persoon
          key={h.id}
          groepId={groepId}
          persoon={h}
          actief={actief.filter(a => a.hoofdpersoon === h.id)}
          open={open.find(o => o.hoofdpersoon === h.id) || null}
          zelf={zelf.includes(h.id)}
          verzoek={verzoek?.hoofdpersoonId === h.id ? verzoek : null}
          isBeheerder={isBeheerder}
          max={max}
        />
      ))}
    </div>
  )
}

function Persoon({ groepId, persoon, actief, open, zelf, verzoek, isBeheerder, max }: {
  groepId: string; persoon: Hoofdpersoon; actief: Actief[]; open: Open | null; zelf: boolean
  verzoek: VriendVerzoek | null; isBeheerder: boolean; max: number
}) {
  const { t, datum } = useT()
  const router = useRouter()
  const voornaam = persoon.naam.split(' ')[0]
  const [vervoer, setVervoer] = useState<Vervoer>(actief[0]?.vervoer || 'verschilt')
  const [link, setLink] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [gekopieerd, setGekopieerd] = useState(false)
  const [verbreekVraag, setVerbreekVraag] = useState<string | null>(null)
  const vol = actief.length >= max

  async function maak() {
    setBezig(true); setFout(null); setGekopieerd(false)
    const r = await maakVriendUitnodiging(groepId, persoon.id, vervoer, verzoek?.id ?? null)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    if ('url' in r && r.url) setLink(r.url)
  }

  async function kopieer() {
    if (!link) return
    try { await navigator.clipboard.writeText(link); setGekopieerd(true) } catch {}
  }

  const deelTekst = link ? `${t('vrienden.familie.deelTekst', { naam: voornaam })} ${link}` : ''

  return (
    <section>
      <h2 className="text-lg font-bold text-caroo-donker mb-1">{persoon.naam}</h2>
      <p className="text-sm text-gray-600 mb-4">{t('vrienden.familie.intro', { naam: voornaam })}</p>

      {verzoek && (
        <p className="caroo-card border-s-4 border-caroo-oranje text-sm text-caroo-donker mb-4">
          👭 {t('vrienden.familie.verzoekBanner', { naam: voornaam, vriend: verzoek.vriendNaam })}
        </p>
      )}

      {isBeheerder && (
        <label className="caroo-card flex items-start gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={zelf}
            onChange={async e => { await zetVriendenZelf(groepId, persoon.id, e.target.checked); router.refresh() }}
            className="mt-1 w-5 h-5 accent-caroo-groen"
          />
          <span>
            <span className="block text-sm font-semibold text-caroo-donker">{t('vrienden.familie.zelfRegelen', { naam: voornaam })}</span>
            <span className="block text-xs text-gray-600">{t('vrienden.familie.zelfUitleg', { naam: voornaam })}</span>
          </span>
        </label>
      )}

      <div className="space-y-2 mb-4">
        {actief.length === 0 && !open && <p className="text-sm text-gray-600">{t('vrienden.familie.geen')}</p>}
        {actief.map(a => (
          <div key={a.id} className="caroo-card space-y-3">
            <p className="font-medium text-caroo-donker">
              👭 {a.wacht ? t('vrienden.familie.wachtOpKeuze', { naam: a.vriendNaam }) : t('vrienden.familie.gekoppeldMet', { naam: a.vriendNaam })}
            </p>
            <VervoerKeuze
              naam={voornaam}
              waarde={a.vervoer}
              onChange={async v => { await wijzigVervoer(groepId, a.id, v); router.refresh() }}
            />
            {verbreekVraag === a.id ? (
              <div className="bg-red-50 rounded-caroo p-3">
                <p className="text-sm text-gray-800 mb-2">{t('vrienden.familie.verbrekenVraag', { naam: voornaam, vriend: a.vriendNaam })}</p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => { await verbreekVriendschap(groepId, a.id); setVerbreekVraag(null); router.refresh() }}
                    className="text-sm font-semibold text-red-600"
                  >{t('vrienden.familie.verbrekenJa')}</button>
                  <button onClick={() => setVerbreekVraag(null)} className="text-sm text-gray-700">{t('algemeen.annuleren')}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setVerbreekVraag(a.id)} className="text-sm text-red-600 hover:underline">{t('vrienden.familie.verbreken')}</button>
            )}
          </div>
        ))}
        {open && !link && (
          <div className="caroo-card flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700">⏳ {t('vrienden.familie.wachtOpAkkoord', { datum: datum(open.verloopt, { day: 'numeric', month: 'long' }) })}</p>
            <button
              onClick={async () => { await trekUitnodigingIn(groepId, open.id); router.refresh() }}
              className="text-sm text-gray-700 underline flex-shrink-0"
            >{t('vrienden.familie.intrekken')}</button>
          </div>
        )}
      </div>

      {vol ? (
        <p className="text-sm text-gray-600">{t('vrienden.familie.maxBereikt', { naam: voornaam })}</p>
      ) : link ? (
        <div className="caroo-card space-y-3">
          <p className="text-sm text-gray-700">{t('vrienden.familie.linkUitleg')}</p>
          <p className="text-xs text-gray-600 break-all bg-gray-50 rounded-caroo p-2" dir="ltr">{link}</p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(deelTekst)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full block text-center"
          >{t('vrienden.familie.deelWhatsapp')}</a>
          <button onClick={kopieer} className="btn-secondary w-full">
            {gekopieerd ? `✓ ${t('vrienden.familie.gekopieerd')}` : t('vrienden.familie.kopieer')}
          </button>
        </div>
      ) : (
        <div className="caroo-card space-y-4">
          {actief.length === 0 && <VervoerKeuze naam={voornaam} waarde={vervoer} onChange={setVervoer} />}
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <button onClick={maak} disabled={bezig} className="btn-primary w-full">
            {bezig ? t('algemeen.evenGeduld') : t('vrienden.familie.maakLink')}
          </button>
        </div>
      )}
    </section>
  )
}
