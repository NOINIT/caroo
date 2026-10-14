'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { registreer } from '@/app/auth/actions'

export default function RegistreerPage() {
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)

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
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">Account aanmaken</h1>
        <p className="text-gray-500">
          {viaUitnodiging
            ? 'Maak een account aan om de uitnodiging te accepteren.'
            : 'Start jouw zorggroep. €19,99 per jaar — voor de hele groep.'}
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
          <label className="input-label" htmlFor="naam">Jouw naam</label>
          <input
            id="naam"
            name="naam"
            type="text"
            autoComplete="name"
            required
            className="input-field"
            placeholder="Voornaam Achternaam"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            className="input-field"
            placeholder="Minimaal 8 tekens"
          />
        </div>

        {!viaUitnodiging && (
          <div className="bg-caroo-groen-licht rounded-caroo p-3 text-sm text-caroo-donker">
            <p>✅ Gratis beginnen, betaal later bij het aanmaken van je zorggroep</p>
            <p className="mt-1">✅ AVG-conform opgeslagen in Europa</p>
          </div>
        )}

        <button
          type="submit"
          disabled={laden}
          className="btn-primary w-full"
        >
          {laden ? 'Account aanmaken...' : 'Account aanmaken'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Al een account?{' '}
        <Link
          href={viaUitnodiging ? `/login?redirect=${redirectNaar}&token=${token}` : '/login'}
          className="text-caroo-groen font-medium hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
