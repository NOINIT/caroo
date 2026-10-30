'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/client'
import { accepteerVriendUitnodiging } from '@/lib/acties/vrienden'

type Vervoer = 'zelf' | 'nodig' | 'verschilt'
interface Keuze { groepId: string; groepNaam: string; id: string; naam: string }

export function Akkoord({ code, keuzes }: { code: string; keuzes: Keuze[] }) {
  const { t } = useT()
  const [gekozen, setGekozen] = useState<Keuze | null>(keuzes.length === 1 ? keuzes[0] : null)
  const [vervoer, setVervoer] = useState<Vervoer>('verschilt')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [klaar, setKlaar] = useState<{ a: string; b: string } | null>(null)

  async function akkoord() {
    if (!gekozen) return
    setBezig(true); setFout(null)
    const r = await accepteerVriendUitnodiging(code, gekozen.groepId, gekozen.id, vervoer)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    if ('naamA' in r) setKlaar({ a: r.naamA as string, b: r.naamB as string })
  }

  if (klaar && gekozen) {
    return (
      <div className="caroo-card text-center">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-lg font-bold text-caroo-donker mb-4">{t('vrienden.familie.gelukt', { a: klaar.a, b: klaar.b })}</p>
        <Link href={`/groep/${gekozen.groepId}/vrienden`} className="btn-primary inline-block">{t('vrienden.familie.naarGroep')}</Link>
      </div>
    )
  }

  const voornaam = gekozen?.naam.split(' ')[0] || ''
  return (
    <div className="caroo-card space-y-5">
      {keuzes.length > 1 && (
        <fieldset>
          <legend className="input-label">{t('vrienden.familie.kiesHoofdpersoon')}</legend>
          <div className="space-y-2">
            {keuzes.map(k => (
              <button
                key={k.groepId + k.id}
                type="button"
                aria-pressed={gekozen === k}
                onClick={() => setGekozen(k)}
                className={`w-full text-start py-3 px-4 rounded-caroo border transition-colors
                  ${gekozen === k ? 'bg-caroo-groen text-white border-caroo-groen' : 'bg-white text-gray-800 border-gray-200'}`}
              >
                <span className="font-semibold">{k.naam}</span>
                <span className="block text-xs opacity-80">{k.groepNaam}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {gekozen && (
        <fieldset>
          <legend className="input-label">{t('vrienden.familie.vervoerVraag', { naam: voornaam })}</legend>
          <div className="grid grid-cols-3 gap-2">
            {(['zelf', 'nodig', 'verschilt'] as Vervoer[]).map(v => (
              <button
                key={v}
                type="button"
                aria-pressed={vervoer === v}
                onClick={() => setVervoer(v)}
                className={`py-2 px-2 rounded-caroo text-sm font-medium border transition-colors
                  ${vervoer === v ? 'bg-caroo-groen text-white border-caroo-groen' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                {t(`vrienden.familie.vervoer.${v}`)}
              </button>
            ))}
          </div>
          {vervoer === 'verschilt' && <p className="text-xs text-gray-600 mt-2">{t('vrienden.familie.vervoerUitleg', { naam: voornaam })}</p>}
        </fieldset>
      )}

      {fout && <p className="text-sm text-red-600">{fout}</p>}
      <button onClick={akkoord} disabled={!gekozen || bezig} className="btn-primary w-full">
        {bezig ? t('algemeen.evenGeduld') : t('vrienden.familie.akkoord')}
      </button>
      <Link href="/dashboard" className="block text-center text-sm text-gray-600 underline">{t('vrienden.familie.nietNu')}</Link>
    </div>
  )
}
