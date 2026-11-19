'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { trekToestemmingIn } from '@/lib/acties/toestemming'

/** Toestemming voor gezondheidsgegevens intrekken: net zo makkelijk als geven (AVG). groot: op de tablet. */
export function ToestemmingIntrekken({ groepId, groot }: { groepId: string; groot?: boolean }) {
  const { t } = useT()
  const router = useRouter()
  const [vraag, setVraag] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [klaar, setKlaar] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const tekst = groot ? 'text-ou-base' : 'text-sm'

  async function trekIn() {
    setBezig(true); setFout(null)
    const r = await trekToestemmingIn(groepId)
    setBezig(false)
    if ('error' in r && r.error) { setFout(r.error); return }
    setKlaar(true); setVraag(false); router.refresh()
  }

  if (klaar) return <p className={`${tekst} text-caroo-groen`} role="status">✓ {t('toestemming.ingetrokken')}</p>
  if (!vraag) return <button onClick={() => setVraag(true)} className={`${tekst} text-gray-600 underline`}>{t('toestemming.intrekLink')}</button>
  return (
    <div className={`rounded-caroo bg-gray-50 p-3 ${tekst} text-gray-700 space-y-3`}>
      <p>{t('toestemming.intrekVraag')}</p>
      {fout && <p className="text-red-600">{fout}</p>}
      <div className="flex gap-3">
        <button onClick={trekIn} disabled={bezig} className="btn-secondary text-sm py-2">{t('toestemming.intrekJa')}</button>
        <button onClick={() => setVraag(false)} className="text-sm text-gray-600 underline px-2">{t('algemeen.annuleren')}</button>
      </div>
    </div>
  )
}
