'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { speelGeluid } from '@/lib/geluid'
import { brengIk } from '@/lib/acties/vrienden'
import type { SamenAfspraak } from '@/lib/vrienden'

export function SamenAfspraken({ groepId, afspraken: start }: { groepId: string; afspraken: SamenAfspraak[] }) {
  const { t, datum } = useT()
  const [afspraken, setAfspraken] = useState(start)
  const [alGeregeld, setAlGeregeld] = useState<string | null>(null)
  if (!afspraken.length) return null

  const vandaag = new Date().toLocaleDateString('sv-SE')
  const morgen = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE')
  const dagNaam = (d: string) => d === vandaag ? t('vrienden.vandaag') : d === morgen ? t('vrienden.morgen') : datum(d + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'short' })

  async function breng(id: string) {
    speelGeluid('succes')
    const r = await brengIk(groepId, id)
    if ('alGeregeld' in r && r.alGeregeld) {
      setAlGeregeld(id)
      setAfspraken(prev => prev.map(a => (a.id === id ? { ...a, brengtNaam: r.naam } : a)))
    } else if ('naam' in r && r.naam) {
      setAfspraken(prev => prev.map(a => (a.id === id ? { ...a, brengtNaam: r.naam as string } : a)))
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{t('vrienden.familie.samenTitel')}</h2>
      <div className="space-y-2">
        {afspraken.map(a => {
          const voornaam = a.hoofdpersoon.split(' ')[0]
          return (
            <div key={a.id} className="caroo-card border-s-4 border-caroo-groen">
              <p className="font-medium text-caroo-donker">👭 {t('vrienden.familie.gepland', { hoofdpersoon: voornaam, vriend: a.vriend })}</p>
              <p className="text-sm text-gray-700">
                {a.wat === 'eigen' && a.eigenTekst ? a.eigenTekst : t(`vrienden.wat.${a.wat}` as any)},{' '}
                {t(`vrienden.dagdeelOp.${a.dagdeel}` as any, { dag: dagNaam(a.dag).toLowerCase() })}
                {a.waar === 'thuis' ? `, ${t('vrienden.bijVriend', { naam: voornaam })}` : a.waar === 'bijVriend' ? `, ${t('vrienden.bijVriend', { naam: a.vriend })}` : ''}
              </p>
              {a.vervoerNodig && (
                a.brengtNaam ? (
                  <p className="text-sm text-caroo-groen font-medium mt-2">
                    🚗 {t('vrienden.familie.brengt', { naam: a.brengtNaam })}
                    {alGeregeld === a.id && <span className="block text-gray-600 font-normal">{t('vrienden.familie.wasEerder')}</span>}
                  </p>
                ) : (
                  <button onClick={() => breng(a.id)} className="btn-primary w-full mt-3 text-sm">
                    🚗 {t('vrienden.familie.ikBreng', { naam: voornaam })}
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
