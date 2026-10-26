'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TALEN } from '@/lib/i18n/talen'
import { useT } from '@/lib/i18n/client'
import { kiesTaal } from '@/lib/acties/taal'

/**
 * Taalkeuze. 'knoppen' voor instellingen (groot, duidelijk),
 * 'compact' voor bovenin openbare pagina's.
 */
export function TaalKiezer({ variant = 'knoppen', groot = false }: { variant?: 'knoppen' | 'compact'; groot?: boolean }) {
  const { taal, t } = useT()
  const router = useRouter()
  const [gekozen, setGekozen] = useState(taal)
  const [bezig, startTransition] = useTransition()

  function kies(code: string) {
    setGekozen(code as typeof taal)
    startTransition(async () => {
      await kiesTaal(code)
      router.refresh()
    })
  }

  if (variant === 'compact') {
    return (
      <label className="inline-flex items-center gap-1.5 text-sm text-gray-600">
        <span aria-hidden>🌐</span>
        <span className="sr-only">{t('algemeen.taal')}</span>
        <select
          value={gekozen}
          onChange={e => kies(e.target.value)}
          disabled={bezig}
          className="bg-transparent border border-gray-200 rounded-lg py-1 ps-2 pe-7 text-sm"
        >
          {TALEN.map(l => (
            <option key={l.code} value={l.code} lang={l.code}>{l.naam}</option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {TALEN.map(l => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          dir={l.dir}
          disabled={bezig}
          onClick={() => kies(l.code)}
          aria-pressed={gekozen === l.code}
          className={`rounded-caroo border-2 ${groot ? 'py-4 text-ou-base' : 'py-2.5 text-sm'} font-medium transition-colors ${
            gekozen === l.code
              ? 'border-caroo-groen bg-caroo-groen-licht text-caroo-donker'
              : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          {l.naam}
        </button>
      ))}
    </div>
  )
}
