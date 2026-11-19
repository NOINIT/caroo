'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/client'
import { bevestig } from './actions'

export function BevestigKnop({ token }: { token: string }) {
  const { t } = useT()
  const [status, setStatus] = useState<'bezig' | 'klaar' | 'verlopen' | 'bezet' | 'mislukt' | null>(null)
  const [email, setEmail] = useState('')
  if (status === 'klaar') return (
    <div className="mt-8" role="status">
      <p className="text-ou-lg text-gray-700">{t('koppelEmail.gelukt', { email })}</p>
      <Link href="/login" className="btn-primary inline-block mt-6">{t('koppelEmail.naarInloggen')}</Link>
    </div>
  )
  return (
    <div className="mt-8">
      <button
        onClick={async () => {
          setStatus('bezig')
          const r = await bevestig(token)
          if ('ok' in r && r.ok) { setEmail(r.email); setStatus('klaar') } else setStatus(('error' in r && r.error) || 'mislukt')
        }}
        disabled={status === 'bezig'}
        className="btn-primary w-full text-lg py-4"
      >
        {t('koppelEmail.bevestigKnop')}
      </button>
      {status === 'verlopen' && <p className="text-gray-700 mt-4">{t('koppelEmail.verlopen')}</p>}
      {status === 'bezet' && <p className="text-gray-700 mt-4">{t('koppelEmail.bezet')}</p>}
      {status === 'mislukt' && <p className="text-gray-700 mt-4">{t('koppelEmail.mislukt')}</p>}
    </div>
  )
}
