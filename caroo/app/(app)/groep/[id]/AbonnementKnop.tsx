'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'

export default function AbonnementKnop({ groepId }: { groepId: string }) {
  const [laden, setLaden] = useState(false)
  const { t } = useT()

  async function openPortal() {
    setLaden(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groepId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLaden(false)
    }
  }

  return (
    <button
      onClick={openPortal}
      disabled={laden}
      className="text-sm text-gray-600 hover:text-gray-800 underline"
    >
      {laden ? t('abonnement.doorsturen') : t('abonnement.beheren')}
    </button>
  )
}
