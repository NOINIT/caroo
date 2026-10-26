'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { inloggen, magicLink, stuurBevestigingOpnieuw } from '@/app/auth/actions'
import { useT } from '@/lib/i18n/client'

function LoginForm() {
  const [tabblad, setTabblad] = useState<'wachtwoord' | 'magic'>('wachtwoord')
  const [fout, setFout] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)
  const [laden, setLaden] = useState(false)
  const [onbevestigdEmail, setOnbevestigdEmail] = useState<string | null>(null)
  const [opnieuwVerstuurd, setOpnieuwVerstuurd] = useState(false)
  const { t } = useT()

  const searchParams = useSearchParams()
  const redirectNaar = searchParams.get('redirect')
  const token = searchParams.get('token')
  const volledigeRedirect = redirectNaar && token
    ? `${redirectNaar}?token=${token}`
    : redirectNaar || '/dashboard'

  const viaUitnodiging = !!redirectNaar
  const netBevestigd = searchParams.get('bevestigd') === '1'

  async function handleInloggen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    setOnbevestigdEmail(null)
    setOpnieuwVerstuurd(false)
    const formData = new FormData(e.currentTarget)
    const resultaat = await inloggen(formData)
    if (resultaat?.error) setFout(resultaat.error)
    if (resultaat && 'onbevestigd' in resultaat && resultaat.onbevestigd) {
      setOnbevestigdEmail(formData.get('email') as string)
    }
    setLaden(false)
  }

  async function handleOpnieuwSturen() {
    if (!onbevestigdEmail) return
    setLaden(true)
    const resultaat = await stuurBevestigingOpnieuw(onbevestigdEmail, volledigeRedirect)
    if (resultaat?.error) {
      setFout(resultaat.error)
    } else {
      setFout(null)
      setOpnieuwVerstuurd(true)
    }
    setLaden(false)
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    const formData = new FormData(e.currentTarget)
    const resultaat = await magicLink(formData)
    if (resultaat?.error) {
      setFout(resultaat.error)
    } else if (resultaat?.success) {
      setSucces(true)
    }
    setLaden(false)
  }

  if (succes) {
    return (
      <div className="caroo-card text-center py-8">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold text-caroo-donker mb-2">
          {t('login.checkMail')}
        </h2>
        <p className="text-gray-600">
          {t('login.linkGestuurd')}
        </p>
        <p className="text-sm text-gray-400 mt-4">
          {t('login.geenMail')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">{t('login.titel')}</h1>
        <p className="text-gray-500">
          {viaUitnodiging ? t('login.viaUitnodiging') : t('login.welkomTerug')}
        </p>
      </div>

      <div className="flex bg-caroo-grijs-licht rounded-caroo p-1 mb-6">
        <button
          onClick={() => setTabblad('wachtwoord')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            tabblad === 'wachtwoord'
              ? 'bg-white text-caroo-groen shadow-sm'
              : 'text-gray-500'
          }`}
        >
          {t('login.tabWachtwoord')}
        </button>
        <button
          onClick={() => setTabblad('magic')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            tabblad === 'magic'
              ? 'bg-white text-caroo-groen shadow-sm'
              : 'text-gray-500'
          }`}
        >
          {t('login.tabLink')}
        </button>
      </div>

      {netBevestigd && !fout && (
        <div className="bg-caroo-groen-licht border border-caroo-groen text-caroo-donker rounded-caroo p-3 mb-4 text-sm">
          {t('login.bevestigd')}
        </div>
      )}

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 mb-4 text-sm">
          {fout}
        </div>
      )}

      {onbevestigdEmail && !opnieuwVerstuurd && (
        <button
          type="button"
          onClick={handleOpnieuwSturen}
          disabled={laden}
          className="btn-secondary w-full mb-4"
        >
          {t('login.opnieuwSturen')}
        </button>
      )}

      {opnieuwVerstuurd && (
        <div className="bg-caroo-groen-licht border border-caroo-groen text-caroo-donker rounded-caroo p-3 mb-4 text-sm">
          {t('login.opnieuwGestuurd', { email: onbevestigdEmail || '' })}
        </div>
      )}

      {tabblad === 'wachtwoord' ? (
        <form onSubmit={handleInloggen} className="space-y-4">
          <input type="hidden" name="redirectNaar" value={volledigeRedirect} />
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
              autoComplete="current-password"
              required
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={laden}
            className="btn-primary w-full mt-2"
          >
            {laden ? t('login.evenWachten') : t('login.inloggen')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <p className="text-sm text-gray-600 bg-caroo-groen-licht rounded-caroo p-3">
            {t('login.geenWachtwoordNodig')}
          </p>
          <div>
            <label className="input-label" htmlFor="email-magic">{t('login.email')}</label>
            <input
              id="email-magic"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field text-ou-base"
              placeholder={t('login.voorbeeldEmail')} dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={laden}
            className="btn-primary w-full mt-2"
          >
            {laden ? t('login.evenWachten') : t('login.stuurLink')}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        {t('login.nogGeenAccount')}{' '}
        <Link
          href={viaUitnodiging ? `/registreer?redirect=${redirectNaar}&token=${token}` : '/registreer'}
          className="text-caroo-groen font-medium hover:underline"
        >
          {t('login.registreer')}
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
