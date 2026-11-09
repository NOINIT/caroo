'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { verwijderAccount } from '@/lib/acties/account'

/** Account verwijderen, met een tweede stap ter bevestiging. groot = op de tablet van de hoofdpersoon. */
export function AccountVerwijderen({ groot }: { groot?: boolean }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const tekst = groot ? 'text-ou-base' : 'text-sm'

  async function ja() {
    setBezig(true); setFout(null)
    const r = await verwijderAccount()
    if ('error' in r && r.error) { setBezig(false); setFout(r.error); return }
    window.location.href = '/?verwijderd=1'
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={`w-full mt-4 py-3 ${tekst} text-gray-500 underline`}>{t('account.knop')}</button>
  }
  return (
    <div className="mt-4 caroo-card border-2 border-red-200 space-y-3" role="alertdialog" aria-labelledby="av-titel">
      <p id="av-titel" className={`font-bold text-caroo-donker ${groot ? 'text-ou-lg' : ''}`}>{t('account.titel')}</p>
      <p className={`${tekst} text-gray-700`}>{t('account.uitleg')}</p>
      <p className={`${tekst} text-gray-700`}>{t('account.eigenaar')}</p>
      {fout && <p className="text-sm text-red-600" role="alert">{fout}</p>}
      <button type="button" onClick={ja} disabled={bezig} className={`w-full py-3 rounded-caroo bg-red-600 text-white font-semibold ${tekst}`}>{bezig ? t('account.bezig') : t('account.ja')}</button>
      <button type="button" onClick={() => setOpen(false)} disabled={bezig} className={`w-full py-3 ${tekst} text-caroo-groen underline`}>{t('account.nee')}</button>
    </div>
  )
}
