'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { maakGroep } from './actions'
import { useT } from '@/lib/i18n/client'

export default function GroepAanmakenPage() {
  const [naam, setNaam] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)
  const [voorMezelf, setVoorMezelf] = useState<boolean | null>(null)
  const router = useRouter()
  const { t } = useT()

  async function handleAanmaken(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim() || voorMezelf === null) return

    setLaden(true)
    setFout(null)

    const r = await maakGroep(naam, voorMezelf)
    if ('error' in r) {
      setFout(r.error ?? t('aanmaken.mislukt'))
      setLaden(false)
      return
    }

    // Voor mezelf: meteen naar het eigen, eenvoudige scherm
    if (voorMezelf) {
      router.push(`/oudere/${r.id}`)
      return
    }
    // Via een vrienduitnodiging? Dan meteen de hoofdpersoon toevoegen en terug naar de uitnodiging
    const terug = new URLSearchParams(window.location.search).get('terug') || ''
    if (/^\/vriend\/[A-Za-z0-9_-]{20,64}$/.test(terug)) {
      router.push(`/groep/${r.id}/koppelen?terug=${encodeURIComponent(terug)}`)
      return
    }
    router.push(`/groep/${r.id}`)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">
          {t('dashboard.groepAanmaken')}
        </h1>
        <p className="text-gray-600">
          {t('aanmaken.intro')}
        </p>
      </div>

      <form onSubmit={handleAanmaken} className="space-y-6">
        <fieldset>
          <legend className="input-label mb-2">{t('aanmaken.voorWie')}</legend>
          <div className="grid gap-3">
            {[
              { waarde: false, kop: t('aanmaken.voorIemand'), uitleg: t('aanmaken.voorIemandUitleg') },
              { waarde: true, kop: t('aanmaken.voorMezelf'), uitleg: t('aanmaken.voorMezelfUitleg') },
            ].map(k => (
              <button
                key={String(k.waarde)}
                type="button"
                aria-pressed={voorMezelf === k.waarde}
                onClick={() => setVoorMezelf(k.waarde)}
                className={`text-start rounded-caroo border-2 p-4 transition-colors ${voorMezelf === k.waarde ? 'border-caroo-groen bg-caroo-groen-licht' : 'border-gray-200 bg-white'}`}
              >
                <span className="block font-semibold text-caroo-donker">{k.kop}</span>
                <span className="block text-sm text-gray-600 mt-1">{k.uitleg}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="input-label" htmlFor="naam">
            {t('aanmaken.naam')}
          </label>
          <input
            id="naam"
            type="text"
            value={naam}
            onChange={e => setNaam(e.target.value)}
            required
            className="input-field text-lg"
            placeholder={t('aanmaken.voorbeeld')}
            maxLength={60}
          />
          <p className="text-xs text-gray-600 mt-1">
            {t('aanmaken.tip')}
          </p>
        </div>

        {fout && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-sm">
            {fout}
          </div>
        )}

        <div className="caroo-card bg-caroo-groen-licht border-caroo-groen border">
          <h3 className="font-semibold text-caroo-donker mb-2">{t('aanmaken.watJeKrijgt')}</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>{t('aanmaken.punt1')}</li>
            <li>{t('aanmaken.punt2')}</li>
            <li>{t('aanmaken.punt3')}</li>
            <li>{t('aanmaken.punt4')}</li>
            <li>{t('registreer.avg')}</li>
          </ul>
          <p className="mt-3 font-bold text-caroo-groen">{t('aanmaken.prijsUitleg')}</p>
        </div>

        <button
          type="submit"
          disabled={laden || !naam.trim() || voorMezelf === null}
          className="btn-primary w-full"
        >
          {laden ? t('login.evenWachten') : t('aanmaken.verder')}
        </button>
      </form>
    </div>
  )
}
