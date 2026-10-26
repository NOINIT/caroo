'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'
import { MetVet } from '@/components/ui/MetVet'
import { JAARPRIJS } from '@/lib/i18n/vertaal'

export default function BetalenPage() {
  const searchParams = useSearchParams()
  const { t } = useT()
  const groepId = searchParams.get('groep')
  const groepNaam = searchParams.get('naam') || t('betalen.jouwGroep')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  async function startBetaling() {
    if (!groepId || !userId) return
    setLaden(true)
    setFout(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groepId, groepNaam, userId, userEmail }),
      })

      const data = await res.json()

      if (data.error) {
        setFout(data.error)
        setLaden(false)
        return
      }

      window.location.href = data.url
    } catch {
      setFout(t('algemeen.lukteNiet'))
      setLaden(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">
          {t('betalen.titel')}
        </h1>
        <p className="text-gray-500">
          <MetVet tekst={t('betalen.activeer')} waarde={groepNaam} sleutel="groep" />
        </p>
      </div>

      <div className="caroo-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-caroo-donker">{groepNaam}</p>
            <p className="text-sm text-gray-500">{t('betalen.product')}</p>
          </div>
          <p className="text-2xl font-bold text-caroo-groen">{JAARPRIJS}</p>
        </div>

        <div className="border-t pt-4 text-sm text-gray-500">
          <p>{t('betalen.methodes')}</p>
          <p className="mt-1">{t('betalen.veilig')}</p>
          <p className="mt-1">{t('betalen.opzegbaar')}</p>
        </div>
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 mb-4 text-sm">
          {fout}
        </div>
      )}

      <button
        onClick={startBetaling}
        disabled={laden || !userId}
        className="btn-primary w-full text-lg py-4"
      >
        {laden ? t('betalen.doorsturen') : t('betalen.nuBetalen', { prijs: JAARPRIJS })}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        {t('betalen.daarna')}
      </p>
    </div>
  )
}