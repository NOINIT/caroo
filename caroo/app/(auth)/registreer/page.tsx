'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { registreer } from '@/app/auth/actions'
import { useT } from '@/lib/i18n/client'

function RegistreerForm() {
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)
  const { t } = useT()

  const searchParams = useSearchParams()
  const redirectNaar = searchParams.get('redirect')
  const token = searchParams.get('token')
  const volledigeRedirect = redirectNaar && token
    ? `${redirectNaar}?token=${token}`
    : redirectNaar || '/dashboard'

  const viaUitnodiging = !!redirectNaar

  async function handleRegistreer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)

    const formData = new FormData(e.currentTarget)
    const resultaat = await registreer(formData)
    if (resultaat?.error) {
      setFout(resultaat.error)
      setLaden(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">{t('registreer.titel')}</h1>
        <p className="text-gray-500">
          {viaUitnodiging ? t('registreer.viaUitnodiging') : t('registreer.intro')}
        </p>
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 mb-4 text-sm">
          {fout}
        </div>
      )}

      <form onSubmit={handleRegistreer} className="space-y-4">
        <input type="hidden" name="redirectNaar" value={volledigeRedirect} />

        <div>
          <label className="input-label" htmlFor="naam">{t('registreer.naam')}</label>
          <input
            id="naam"
            name="naam"
            type="text"
            autoComplete="name"
            required
            className="input-field"
            placeholder={t('registreer.voorbeeldNaam')}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="email">{t('login.email')}</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-field"
            placeholder={t('login.voorbeeldEmail')} dir="ltr"
          />
        </div>
        <div>
          <label className="input-label" htmlFor="wachtwoord">{t('login.wachtwoord')}</label>
          <input
            id="wachtwoord"
            name="wachtwoord"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input-field"
            placeholder={t('registreer.minimaal8')}
          />
        </div>

        {!viaUitnodiging && (
          <div className="bg-caroo-groen-licht rounded-caroo p-3 text-sm text-caroo-donker">
            <p>{t('registreer.gratisBeginnen')}</p>
            <p className="mt-1">{t('registreer.avg')}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={laden}
          className="btn-primary w-full"
        >
          {laden ? t('registreer.bezig') : t('registreer.titel')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        {t('registreer.alAccount')}{' '}
        <Link
          href={viaUitnodiging ? `/login?redirect=${redirectNaar}&token=${token}` : '/login'}
          className="text-caroo-groen font-medium hover:underline"
        >
          {t('registreer.logIn')}
        </Link>
      </p>
    </div>
  )
}

export default function RegistreerPage() {
  return (
    <Suspense>
      <RegistreerForm />
    </Suspense>
  )
}
