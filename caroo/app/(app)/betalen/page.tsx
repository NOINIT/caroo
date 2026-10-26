'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BetalenPage() {
  const searchParams = useSearchParams()
  const groepId = searchParams.get('groep')
  const groepNaam = searchParams.get('naam') || 'Jouw zorggroep'
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
      setFout('Er is iets misgegaan. Probeer het opnieuw.')
      setLaden(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">
          Zorggroep activeren
        </h1>
        <p className="text-gray-500">
          Activeer <strong>{groepNaam}</strong> met een jaarabonnement.
        </p>
      </div>

      <div className="caroo-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-caroo-donker">{groepNaam}</p>
            <p className="text-sm text-gray-500">Clanoo zorggroep — jaarabonnement</p>
          </div>
          <p className="text-2xl font-bold text-caroo-groen">€19,99</p>
        </div>

        <div className="border-t pt-4 text-sm text-gray-500">
          <p>💳 Betalen met iDEAL, creditcard of debitcard</p>
          <p className="mt-1">🔒 Veilig betalen via Stripe</p>
          <p className="mt-1">🔄 Jaarabonnement — opzegbaar wanneer je wil</p>
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
        {laden ? 'Doorsturen naar betaling...' : '💳 Nu betalen — €19,99/jaar'}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        Na betaling kun je direct leden uitnodigen
      </p>
    </div>
  )
}