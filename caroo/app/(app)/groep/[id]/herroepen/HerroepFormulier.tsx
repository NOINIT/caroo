'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/client'
import { herroep } from '@/lib/acties/herroepen'

export function HerroepFormulier({ groepId, naam: startNaam, email, overeenkomst }: { groepId: string; naam: string; email: string; overeenkomst: string }) {
  const { t, datum } = useT()
  const [naam, setNaam] = useState(startNaam)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [klaar, setKlaar] = useState<{ proefTot: string | null } | null>(null)

  async function bevestig(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true); setFout(null)
    const r = await herroep(groepId, naam)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    if ('ok' in r) setKlaar({ proefTot: r.proefTot ?? null })
  }

  if (klaar) {
    return (
      <div className="caroo-card border-2 border-caroo-groen bg-caroo-groen-licht space-y-3" role="status">
        <h2 className="text-xl font-bold text-caroo-donker">{t('herroepen.klaarTitel')}</h2>
        <p className="text-gray-700">{t('herroepen.klaarTekst')}</p>
        {klaar.proefTot && <p className="text-gray-700">{t('herroepen.klaarProef', { datum: datum(klaar.proefTot, { day: 'numeric', month: 'long' }) })}</p>}
        <Link href={`/groep/${groepId}`} className="btn-secondary block text-center">{t('herroepen.terug')}</Link>
      </div>
    )
  }

  return (
    <form onSubmit={bevestig} className="caroo-card space-y-4">
      <div>
        <label htmlFor="hr-naam" className="input-label">{t('herroepen.naam')}</label>
        <input id="hr-naam" className="input-field" value={naam} onChange={e => setNaam(e.target.value)} required maxLength={80} autoComplete="name" />
      </div>
      <div>
        <p className="input-label">{t('herroepen.overeenkomst')}</p>
        <p className="text-gray-800">{overeenkomst}</p>
      </div>
      <p className="text-sm text-gray-700">{t('herroepen.bevestigingNaar', { email })}</p>
      {fout && <p className="text-sm text-red-600" role="alert">{fout}</p>}
      <button type="submit" disabled={bezig || !naam.trim()} className="btn-primary w-full">
        {bezig ? t('herroepen.bezig') : t('herroepen.knop')}
      </button>
    </form>
  )
}
