'use client'

import { useState } from 'react'
import Link from 'next/link'
import { wachtwoordVergeten } from '@/app/auth/actions'
import { useT } from '@/lib/i18n/client'

export default function WachtwoordVergetenPage() {
  const [fout, setFout] = useState<string | null>(null)
  const [gestuurd, setGestuurd] = useState(false)
  const [laden, setLaden] = useState(false)
  const { t } = useT()

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    const resultaat = await wachtwoordVergeten(new FormData(e.currentTarget))
    if (resultaat?.error) setFout(resultaat.error)
    else setGestuurd(true)
    setLaden(false)
  }

  if (gestuurd) {
    return (
      <div className="caroo-card text-center py-8">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-xl font-bold text-caroo-donker mb-2">{t('wachtwoord.gestuurdTitel')}</h1>
        <p className="text-gray-600">{t('wachtwoord.gestuurd')}</p>
        <Link href="/login" className="btn-secondary w-full block text-center mt-6">
          {t('wachtwoord.terug')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">{t('wachtwoord.vergetenTitel')}</h1>
        <p className="text-gray-600">{t('wachtwoord.vergetenUitleg')}</p>
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 mb-4 text-sm">
          {fout}
        </div>
      )}

      <form onSubmit={verstuur} className="space-y-4">
        <div>
          <label className="input-label" htmlFor="email">{t('login.email')}</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-field"
            placeholder={t('login.voorbeeldEmail')}
            dir="ltr"
          />
        </div>
        <button type="submit" disabled={laden} className="btn-primary w-full mt-2">
          {laden ? t('login.evenWachten') : t('wachtwoord.stuur')}
        </button>
      </form>

      <p className="text-center text-sm mt-6">
        <Link href="/login" className="text-caroo-groen font-medium hover:underline">
          {t('wachtwoord.terug')}
        </Link>
      </p>
    </div>
  )
}
