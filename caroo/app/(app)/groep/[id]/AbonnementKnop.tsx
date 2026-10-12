'use client'

import { useState } from 'react'

export default function AbonnementKnop({ groepId }: { groepId: string }) {
  const [laden, setLaden] = useState(false)

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
      className="text-sm text-gray-400 hover:text-gray-600 underline"
    >
      {laden ? 'Doorsturen...' : 'Abonnement beheren of opzeggen'}
    </button>
  )
}
