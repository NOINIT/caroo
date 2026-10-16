'use client'

import { useState } from 'react'
import Link from 'next/link'
import { stuurOudereInloglink } from '@/app/auth/actions'

interface Props {
  token: string
  groepNaam: string
  gemaskeerdEmail: string
}

export function OudereUitnodiging({ token, groepNaam, gemaskeerdEmail }: Props) {
  const [naam, setNaam] = useState('')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [verstuurdNaar, setVerstuurdNaar] = useState<string | null>(null)

  async function verstuur(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    const resultaat = await stuurOudereInloglink(token, naam)
    if ('error' in resultaat && resultaat.error) {
      setFout(resultaat.error)
    } else if ('email' in resultaat && resultaat.email) {
      setVerstuurdNaar(resultaat.email)
    }
    setLaden(false)
  }

  if (verstuurdNaar) {
    return (
      <div className="caroo-card text-center py-8 px-5">
        <div className="text-6xl mb-4">📬</div>
        <h1 className="text-ou-xl font-bold text-caroo-donker mb-3">Kijk in uw e-mail</h1>
        <p className="text-ou-base text-gray-700 mb-2">
          We hebben een mail gestuurd naar <strong>{verstuurdNaar}</strong>.
        </p>
        <p className="text-ou-base text-gray-700 mb-4">
          Klik in die mail op de knop. Dan bent u meteen binnen bij {groepNaam}.
        </p>
        <p className="text-ou-sm text-gray-500">
          Geen mail gezien? Kijk ook bij ongewenste mail. De link werkt één keer en is een uur geldig.
        </p>
      </div>
    )
  }

  return (
    <div className="caroo-card text-center py-8 px-5">
      <div className="text-6xl mb-4">🤝</div>
      <h1 className="text-ou-xl font-bold text-caroo-donker mb-2">U bent uitgenodigd!</h1>
      <p className="text-ou-base text-gray-600 mb-1">Uw familie nodigt u uit voor</p>
      <p className="text-ou-lg text-caroo-groen font-bold mb-6">{groepNaam}</p>

      <form onSubmit={verstuur} className="space-y-4 text-left">
        <div>
          <label htmlFor="naam" className="block text-ou-base font-medium text-caroo-donker mb-2">
            Hoe mag de familie u noemen?
          </label>
          <input
            id="naam"
            type="text"
            value={naam}
            onChange={e => setNaam(e.target.value)}
            placeholder="bijv. Oma Riet"
            maxLength={60}
            autoComplete="name"
            className="input-field text-ou-base py-4"
          />
        </div>

        <p className="text-ou-sm text-gray-600">
          U hoeft geen wachtwoord te onthouden. We sturen een inloglink naar <strong>{gemaskeerdEmail}</strong>.
        </p>

        {fout && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-ou-sm">
            {fout}
          </div>
        )}

        <button type="submit" disabled={laden} className="btn-primary w-full text-ou-base py-5">
          {laden ? 'Even geduld...' : '✉️ Stuur mij een inloglink'}
        </button>
      </form>

      <Link
        href={`/login?redirect=/uitnodiging&token=${token}`}
        className="inline-block mt-5 text-sm text-gray-500 underline"
      >
        Ik heb al een wachtwoord
      </Link>
    </div>
  )
}
