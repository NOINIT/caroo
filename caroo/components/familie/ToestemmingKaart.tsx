'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { geefToestemming } from '@/lib/acties/toestemming'

/**
 * Eenmalige vraag om toestemming voor gezondheidsgegevens (medicijnen en de smiley),
 * voor groepen die al bestonden voordat we dit vastlegden.
 * zelf: de hoofdpersoon geeft het zelf (groot, op de tablet). Anders vraagt de beheerder het namens de familie.
 */
export function ToestemmingKaart({ groepId, naam, zelf }: { groepId: string; naam?: string | null; zelf?: boolean }) {
  const { t } = useT()
  const [klaar, setKlaar] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const wie = (naam || '').split(' ')[0] || t('algemeen.deHoofdpersoon')

  async function geef() {
    setBezig(true); setFout(null)
    const r = await geefToestemming(groepId)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    setKlaar(true)
  }

  if (klaar) {
    return <div className={`caroo-card border-s-4 border-caroo-groen ${zelf ? 'text-ou-base' : 'text-sm'} text-caroo-donker`} role="status">✓ {t('toestemming.gegeven')}</div>
  }

  return (
    <div className="caroo-card border-s-4 border-caroo-oranje space-y-3">
      <p className={`font-bold text-caroo-donker ${zelf ? 'text-ou-lg' : ''}`}>{t('toestemming.kaartTitel')}</p>
      <p className={zelf ? 'text-ou-base text-gray-700' : 'text-sm text-gray-700'}>
        {zelf ? t('toestemming.kaartZelfTekst') : t('toestemming.kaartTekst', { naam: wie })}
      </p>
      {!zelf && <p className="text-xs text-gray-600">{t('toestemming.vertegenwoordiger', { naam: wie })}</p>}
      {fout && <p className="text-sm text-red-600">{fout}</p>}
      <button onClick={geef} disabled={bezig} className={zelf ? 'btn-primary w-full text-ou-base py-4' : 'btn-primary w-full'}>
        {zelf ? t('toestemming.kaartZelfKnop') : t('toestemming.kaartKnop', { naam: wie })}
      </button>
    </div>
  )
}
