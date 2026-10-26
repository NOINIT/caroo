'use client'

import { useState } from 'react'
import Link from 'next/link'
import { stuurOudereInloglink } from '@/app/auth/actions'
import { useT } from '@/lib/i18n/client'
import { MetVet } from '@/components/ui/MetVet'

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
  const { t } = useT()

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
        <h1 className="text-ou-xl font-bold text-caroo-donker mb-3">{t('oudereUitnodiging.kijkInMail')}</h1>
        <p className="text-ou-base text-gray-700 mb-2">
          <MetVet tekst={t('oudereUitnodiging.mailGestuurd')} waarde={verstuurdNaar} sleutel="email" />
        </p>
        <p className="text-ou-base text-gray-700 mb-4">
          {t('oudereUitnodiging.klikKnop', { groep: groepNaam })}
        </p>
        <p className="text-ou-sm text-gray-500">
          {t('oudereUitnodiging.geenMail')}
        </p>
      </div>
    )
  }

  return (
    <div className="caroo-card text-center py-8 px-5">
      <div className="text-6xl mb-4">🤝</div>
      <h1 className="text-ou-xl font-bold text-caroo-donker mb-2">{t('oudereUitnodiging.titel')}</h1>
      <p className="text-ou-base text-gray-600 mb-1">{t('oudereUitnodiging.familieNodigt')}</p>
      <p className="text-ou-lg text-caroo-groen font-bold mb-6">{groepNaam}</p>

      <form onSubmit={verstuur} className="space-y-4 text-start">
        <div>
          <label htmlFor="naam" className="block text-ou-base font-medium text-caroo-donker mb-2">
            {t('oudereUitnodiging.hoeNoemen')}
          </label>
          <input
            id="naam"
            type="text"
            value={naam}
            onChange={e => setNaam(e.target.value)}
            placeholder={t('oudereUitnodiging.voorbeeldNaam')}
            maxLength={60}
            autoComplete="name"
            className="input-field text-ou-base py-4"
          />
        </div>

        <p className="text-ou-sm text-gray-600">
          <MetVet tekst={t('oudereUitnodiging.geenWachtwoord')} waarde={gemaskeerdEmail} sleutel="email" />
        </p>

        {fout && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-ou-sm">
            {fout}
          </div>
        )}

        <button type="submit" disabled={laden} className="btn-primary w-full text-ou-base py-5">
          {laden ? t('algemeen.evenGeduld') : t('oudereUitnodiging.stuurLink')}
        </button>
      </form>

      <Link
        href={`/login?redirect=/uitnodiging&token=${token}`}
        className="inline-block mt-5 text-sm text-gray-500 underline"
      >
        {t('oudereUitnodiging.alWachtwoord')}
      </Link>
    </div>
  )
}
