'use client'

import { useState } from 'react'
import { LETTERGROOTTES, lettergroottePx, type Lettergrootte } from '@/lib/voorkeuren'
import { speelGeluid, zetGeluid } from '@/lib/geluid'
import { slaVoorkeurenOp } from '@/app/(app)/instellingen/actions'
import { MeldingenInstellingen } from './MeldingenInstellingen'
import { TaalKiezer } from '@/components/TaalKiezer'
import { useT } from '@/lib/i18n/client'

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
  const { t } = useT()

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
        <h2 className={kop}>{t('instellingen.mijnNaam')}</h2>
        <input
          type="text"
          value={naam}
          onChange={e => { setNaam(e.target.value); setStatus('rust') }}
          maxLength={60}
          className={`input-field ${groot ? 'text-ou-base py-4' : ''}`}
          aria-label={t('instellingen.mijnNaam')}
        />
        <p className="text-xs text-gray-400 mt-1">{t('instellingen.ingelogdAls', { email })}</p>
      </section>

      <section>
        <h2 className={kop}>{t('instellingen.taal')}</h2>
        <p className="text-xs text-gray-500 mb-3">{t('instellingen.taalUitleg')}</p>
        <TaalKiezer groot={groot} />
      </section>

      <section>
        <h2 className={kop}>{t('instellingen.lettergrootte')}</h2>
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
              <span className="block text-xs mt-0.5">{t(`lettergrootte.${l.waarde}`)}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className={kop}>{t('instellingen.geluid')}</h2>
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
              {aan ? t('instellingen.geluidAan') : t('instellingen.geluidUit')}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className={kop}>{t('instellingen.meldingen')}</h2>
        <p className="text-xs text-gray-500 mb-3">
          {t('instellingen.meldingenUitleg')}
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
        {status === 'bezig' ? t('algemeen.opslaanBezig') : status === 'opgeslagen' ? t('algemeen.opgeslagen') : t('algemeen.opslaan')}
      </button>
    </div>
  )
}
