'use client'

import { useState } from 'react'
import { meldAf } from './actions'

export function AfmeldKnop({ code }: { code: string }) {
  const [status, setStatus] = useState<'klaar' | 'bezig' | 'mis' | null>(null)
  if (status === 'klaar') return <p className="text-lg text-gray-700">Je bent afgemeld. Je krijgt geen mails meer over de wachtlijst.</p>
  return (
    <form action={async (fd) => { setStatus('bezig'); const r = await meldAf(fd); setStatus(r.ok ? 'klaar' : 'mis') }}>
      <input type="hidden" name="c" value={code} />
      <button type="submit" disabled={status === 'bezig'} className="rounded-full bg-[#1A7A6E] px-7 py-3.5 text-lg font-bold text-white disabled:opacity-60">
        {status === 'bezig' ? 'Even geduld…' : 'Ja, meld me af'}
      </button>
      {status === 'mis' && <p className="mt-3 text-gray-700">Dat lukte niet. Mail ons gerust op hallo@noinit.nl, dan regelen we het.</p>}
    </form>
  )
}
