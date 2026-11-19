'use client'

import { useState } from 'react'
import { meldAf } from './actions'

type Teksten = { vraag: string; knop: string; bezig: string; klaar: string; mis: string }

export function AfmeldKnop({ code, tekst }: { code: string; tekst: Teksten }) {
  const [status, setStatus] = useState<'klaar' | 'bezig' | 'mis' | null>(null)
  if (status === 'klaar') return <p className="mt-4 text-lg text-gray-700" role="status">{tekst.klaar}</p>
  return (
    <>
    <p className="mt-4 mb-8 text-lg text-gray-700">{tekst.vraag}</p>
    <form action={async (fd) => { setStatus('bezig'); const r = await meldAf(fd); setStatus(r.ok ? 'klaar' : 'mis') }}>
      <input type="hidden" name="c" value={code} />
      <button type="submit" disabled={status === 'bezig'} className="rounded-full bg-[#1A7A6E] px-7 py-3.5 text-lg font-bold text-white disabled:opacity-60">
        {status === 'bezig' ? tekst.bezig : tekst.knop}
      </button>
      {status === 'mis' && <p className="mt-3 text-gray-700">{tekst.mis}</p>}
    </form>
    </>
  )
}
