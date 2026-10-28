'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'
import { JAARPRIJS } from '@/lib/i18n/vertaal'

export default function GroepAanmakenPage() {
  const [naam, setNaam] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)
  const router = useRouter()
  const { t } = useT()

  async function handleAanmaken(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim()) return

    setLaden(true)
    setFout(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Groep aanmaken
    const { data: groep, error } = await supabase
      .from('zorggroepen')
      .insert({ naam: naam.trim(), eigenaar_id: user.id })
      .select()
      .single()

    if (error || !groep) {
      setFout(t('aanmaken.mislukt'))
      setLaden(false)
      return
    }

    // Eigenaar ook als groepslid toevoegen
    await supabase.from('groepsleden').insert({
      groep_id: groep.id,
      user_id: user.id,
      rol: 'groepsbeheerder',
    })

    // Redirect naar betaalpagina
    router.push(`/betalen?groep=${groep.id}&naam=${encodeURIComponent(naam)}`)
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
          <p className="mt-3 font-bold text-caroo-groen">{t('aanmaken.perJaar', { prijs: JAARPRIJS })}</p>
        </div>

        <button
          type="submit"
          disabled={laden || !naam.trim()}
          className="btn-primary w-full"
        >
          {laden ? t('login.evenWachten') : t('aanmaken.verder')}
        </button>
      </form>
    </div>
  )
}
