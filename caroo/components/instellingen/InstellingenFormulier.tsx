'use client'

import { useState } from 'react'
import { LETTERGROOTTES, lettergroottePx, type Lettergrootte } from '@/lib/voorkeuren'
import { speelGeluid, zetGeluid } from '@/lib/geluid'
import { slaVoorkeurenOp } from '@/app/(app)/instellingen/actions'
import { MeldingenInstellingen } from './MeldingenInstellingen'

interface Props {
  naam: string
  email: string
  lettergrootte: string
  geluid: boolean
  meldingEmail?: boolean
  /** Extra grote knoppen voor de hoofdpersoon */
  groot?: boolean
}

export function InstellingenFormulier({ naam: startNaam, email, lettergrootte: startGrootte, geluid: startGeluid, meldingEmail = true, groot = false }: Props) {
  const [naam, setNaam] = useState(startNaam)
  const [grootte, setGrootte] = useState<Lettergrootte>((startGrootte as Lettergrootte) || 'normaal')
  const [geluid, setGeluid] = useState(startGeluid)
  const [status, setStatus] = useState<'rust' | 'bezig' | 'opgeslagen' | 'fout'>('rust')
  const [fout, setFout] = useState('')

  function kiesGrootte(waarde: Lettergrootte) {
    setGrootte(waarde)
    // Direct laten zien hoe het eruitziet
    document.documentElement.style.fontSize = `${lettergroottePx(waarde)}px`
    setStatus('rust')
  }

  function kiesGeluid(aan: boolean) {
    setGeluid(aan)
    zetGeluid(aan)
    if (aan) speelGeluid('tik', true)
    setStatus('rust')
  }

  async function opslaan() {
    setStatus('bezig')
    const r = await slaVoorkeurenOp({ naam, lettergrootte: grootte, geluid })
    if ('error' in r && r.error) {
      setFout(r.error)
      setStatus('fout')
      return
    }
    speelGeluid('succes')
    setStatus('opgeslagen')
  }

  const kop = groot ? 'text-ou-lg font-bold text-caroo-donker mb-3' : 'text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2'
  const knop = groot ? 'py-4 text-ou-base' : 'py-2.5 text-sm'

  return (
    <div className="space-y-6">
      <section>
        <h2 className={kop}>Mijn naam</h2>
        <input
          type="text"
          value={naam}
          onChange={e => { setNaam(e.target.value); setStatus('rust') }}
          maxLength={60}
          className={`input-field ${groot ? 'text-ou-base py-4' : ''}`}
          aria-label="Mijn naam"
        />
        <p className="text-xs text-gray-400 mt-1">Ingelogd als {email}</p>
      </section>

      <section>
        <h2 className={kop}>Lettergrootte</h2>
        <div className="grid grid-cols-2 gap-2">
          {LETTERGROOTTES.map(l => (
            <button
              key={l.waarde}
              type="button"
              onClick={() => kiesGrootte(l.waarde)}
              aria-pressed={grootte === l.waarde}
              className={`rounded-caroo border-2 ${knop} font-medium transition-colors ${
                grootte === l.waarde
                  ? 'border-caroo-groen bg-caroo-groen-licht text-caroo-donker'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <span style={{ fontSize: `${l.px}px` }}>Aa</span>
              <span className="block text-xs mt-0.5">{l.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className={kop}>Geluid</h2>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map(aan => (
            <button
              key={String(aan)}
              type="button"
              onClick={() => kiesGeluid(aan)}
              aria-pressed={geluid === aan}
              className={`rounded-caroo border-2 ${knop} font-medium transition-colors ${
                geluid === aan
                  ? 'border-caroo-groen bg-caroo-groen-licht text-caroo-donker'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {aan ? '🔔 Aan' : '🔕 Uit'}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className={kop}>Meldingen</h2>
        <p className="text-xs text-gray-500 mb-3">
          Bijvoorbeeld als iemand om bezoek vraagt, of als iemand laat weten dat hij langskomt.
        </p>
        <MeldingenInstellingen email={meldingEmail} groot={groot} />
      </section>

      {status === 'fout' && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-sm">{fout}</div>
      )}

      <button
        type="button"
        onClick={opslaan}
        disabled={status === 'bezig'}
        className={`btn-primary w-full ${groot ? 'text-ou-base py-5' : ''}`}
      >
        {status === 'bezig' ? 'Opslaan...' : status === 'opgeslagen' ? '✓ Opgeslagen' : 'Opslaan'}
      </button>
    </div>
  )
}
