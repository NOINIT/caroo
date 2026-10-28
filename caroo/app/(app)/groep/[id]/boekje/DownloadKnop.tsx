'use client'

import { useT } from '@/lib/i18n/client'

/** Opent de printfunctie: daar kies je 'Opslaan als PDF' */
export function DownloadKnop() {
  const { t } = useT()
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary text-sm px-4 py-2">
      {t('boekje.download')}
    </button>
  )
}
