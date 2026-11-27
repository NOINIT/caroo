'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { ONDERDELEN, RELATIES } from '@/lib/onderdelen'
import { zetZichtbaar, zetRelatie } from '@/lib/acties/beheer'

/** Per persoon: hoe hoort hij erbij, en welke onderdelen ziet hij. Alleen voor familieleden, vrienden en mantelzorgers. */
export function RechtenPerLid({ groepId, lidId, naam, hoofdpersoon, relatie: startRelatie, verborgen: startVerborgen }: {
  groepId: string; lidId: string; naam: string; hoofdpersoon: string; relatie: string | null; verborgen: string[]
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [verborgen, setVerborgen] = useState<string[]>(startVerborgen || [])
  const [relatie, setRelatieState] = useState(startRelatie || 'familie')
  const voornaam = naam.split(' ')[0]

  async function wissel(onderdeel: string) {
    const zichtbaar = verborgen.includes(onderdeel)
    setVerborgen(prev => zichtbaar ? prev.filter(o => o !== onderdeel) : [...prev, onderdeel])
    const r = await zetZichtbaar(groepId, lidId, onderdeel, zichtbaar)
    if ('verborgen' in r && r.verborgen) setVerborgen(r.verborgen)
  }

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)} className="text-xs text-caroo-groen font-medium hover:underline">
        👁 {t('relaties.titel', { naam: voornaam })}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-caroo bg-gray-50 p-3">
          <label className="text-xs text-gray-700 flex items-center gap-2">
            {t('relaties.relatie')}
            <select value={relatie} onChange={e => { setRelatieState(e.target.value); zetRelatie(groepId, lidId, e.target.value) }} className="input-field text-xs py-1">
              {RELATIES.map(r => <option key={r} value={r}>{t(`relaties.${r}`)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-1">
            {ONDERDELEN.map(o => {
              const aan = !verborgen.includes(o)
              return (
                <label key={o} className="flex items-center gap-2 text-sm text-caroo-donker cursor-pointer">
                  <input type="checkbox" checked={aan} onChange={() => wissel(o)} className="w-5 h-5 accent-caroo-groen" />
                  {t(`relaties.o_${o}`, { hp: hoofdpersoon })}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
