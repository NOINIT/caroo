'use client'

import { useState } from 'react'
import Link from 'next/link'
import { inloggen, magicLink } from '@/app/auth/actions'

export default function LoginPage() {
  const [tabblad, setTabblad] = useState<'wachtwoord' | 'magic'>('wachtwoord')
  const [fout, setFout] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)
  const [laden, setLaden] = useState(false)

  async function handleInloggen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    const formData = new FormData(e.currentTarget)
    const resultaat = await inloggen(formData)
    if (resultaat?.error) setFout(resultaat.error)
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
          Check je e-mail
        </h2>
        <p className="text-gray-600">
          We hebben een inloglink gestuurd. Klik op de link in de e-mail om in te loggen.
        </p>
        <p className="text-sm text-gray-400 mt-4">
          Geen e-mail ontvangen? Check ook je spamfolder.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">Inloggen</h1>
        <p className="text-gray-500">Welkom terug bij Caroo</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-caroo-grijs-licht rounded-caroo p-1 mb-6">
        <button
          onClick={() => setTabblad('wachtwoord')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            tabblad === 'wachtwoord'
              ? 'bg-white text-caroo-groen shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Wachtwoord
        </button>
        <button
          onClick={() => setTabblad('magic')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            tabblad === 'magic'
              ? 'bg-white text-caroo-groen shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Inloglink (voor ouderen)
        </button>
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 mb-4 text-sm">
          {fout}
        </div>
      )}

      {tabblad === 'wachtwoord' ? (
        <form onSubmit={handleInloggen} className="space-y-4">
          <div>
            <label className="input-label" htmlFor="email">E-mailadres</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder="naam@voorbeeld.nl"
            />
          </div>
          <div>
            <label className="input-label" htmlFor="wachtwoord">Wachtwoord</label>
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
            {laden ? 'Even wachten...' : 'Inloggen'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <p className="text-sm text-gray-600 bg-caroo-groen-licht rounded-caroo p-3">
            ✨ Geen wachtwoord nodig. Vul je e-mailadres in en we sturen een inloglink.
          </p>
          <div>
            <label className="input-label" htmlFor="email-magic">E-mailadres</label>
            <input
              id="email-magic"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field text-ou-base"
              placeholder="naam@voorbeeld.nl"
            />
          </div>
          <button
            type="submit"
            disabled={laden}
            className="btn-primary w-full mt-2"
          >
            {laden ? 'Even wachten...' : 'Stuur inloglink'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        Nog geen account?{' '}
        <Link href="/registreer" className="text-caroo-groen font-medium hover:underline">
          Registreer je gratis
        </Link>
      </p>
    </div>
  )
}
