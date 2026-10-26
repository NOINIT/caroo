'use client'

import { useState } from 'react'
import Link from 'next/link'
import { bevestigInlog } from './actions'

export function BevestigKnop({ tokenHash, type, next }: { tokenHash: string; type: string; next: string }) {
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  async function verstuur(formData: FormData) {
    setLaden(true)
    setFout(null)
    const resultaat = await bevestigInlog(formData)
    // Bij succes stuurt de server door; hier komen we alleen bij een fout
    if (resultaat?.error) setFout(resultaat.error)
    setLaden(false)
  }

  if (fout) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-ou-sm">
          {fout}
        </div>
        <Link href="/login" className="btn-primary w-full block text-center text-ou-base py-4">
          Nieuwe inloglink aanvragen
        </Link>
      </div>
    )
  }

  return (
    <form action={verstuur}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      <button type="submit" disabled={laden} className="btn-primary w-full text-ou-base py-5">
        {laden ? 'Even geduld...' : 'Inloggen bij Clanoo'}
      </button>
    </form>
  )
}
