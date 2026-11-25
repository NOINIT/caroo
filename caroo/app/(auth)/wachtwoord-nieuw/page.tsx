'use client'

import { useState } from 'react'
import Link from 'next/link'
import { nieuwWachtwoord } from '@/app/auth/actions'
import { useT } from '@/lib/i18n/client'

// Hier kom je via de link in de wachtwoordmail. Zonder sessie stuurt de middleware je naar /login.
export default function WachtwoordNieuwPage() {
  const [fout, setFout] = useState<string | null>(null)
  const [klaar, setKlaar] = useState(false)
  const [laden, setLaden] = useState(false)
  const { t } = useT()

  async function opslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    const resultaat = await nieuwWachtwoord(new FormData(e.currentTarget))
    if (resultaat?.error) setFout(resultaat.error)
    else setKlaar(true)
    setLaden(false)
  }

  if (klaar) {
    return (
      <div className="caroo-card text-center py-8">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-caroo-donker mb-4">{t('wachtwoord.opgeslagen')}</h1>
        <Link href="/dashboard" className="btn-primary w-full block text-center">
          {t('wachtwoord.verder')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">{t('wachtwoord.nieuwTitel')}</h1>
        <p className="text-gray-600">{t('wachtwoord.nieuwUitleg')}</p>
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 mb-4 text-sm">
          {fout}
        </div>
      )}

      <form onSubmit={opslaan} className="space-y-4">
        <div>
          <label className="input-label" htmlFor="wachtwoord">{t('wachtwoord.nieuw')}</label>
          <input id="wachtwoord" name="wachtwoord" type="password" autoComplete="new-password" minLength={8} required className="input-field" />
        </div>
        <div>
          <label className="input-label" htmlFor="herhaal">{t('wachtwoord.herhaal')}</label>
          <input id="herhaal" name="herhaal" type="password" autoComplete="new-password" minLength={8} required className="input-field" />
        </div>
        <button type="submit" disabled={laden} className="btn-primary w-full mt-2">
          {laden ? t('login.evenWachten') : t('wachtwoord.opslaan')}
        </button>
      </form>
    </div>
  )
}
