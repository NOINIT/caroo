'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { koppel } from './actions'

export function StartKnop({ code }: { code: string }) {
  const { t } = useT()
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(false)
  return (
    <div className="mt-10">
      <button
        onClick={async () => { setBezig(true); setFout(false); const r = await koppel(code); if (r?.error) { setFout(true); setBezig(false) } }}
        disabled={bezig}
        className="w-full rounded-caroo-lg bg-caroo-oranje-donker text-white text-3xl font-bold py-8 shadow-md active:scale-[0.98] transition-transform"
      >
        {bezig ? t('koppelen.bezig') : t('koppelen.start')}
      </button>
      {fout && <p className="text-ou-base text-red-700 mt-4">{t('koppelen.ongeldigTekst')}</p>}
    </div>
  )
}
