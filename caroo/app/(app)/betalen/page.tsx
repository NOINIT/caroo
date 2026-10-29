'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'
import { MetVet } from '@/components/ui/MetVet'
import { PRIJS, JAAR_PER_MAAND, euro, type Plan } from '@/lib/prijzen'
import { toegangVan } from '@/lib/opzeggen'

export default function BetalenPage() {
  const searchParams = useSearchParams()
  const { t, datum } = useT()
  const groepId = searchParams.get('groep')
  const groepNaam = searchParams.get('naam') || t('betalen.jouwGroep')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [klaar, setKlaar] = useState(false)
  const [proefTot, setProefTot] = useState<Date | null>(null)
  const [proefVoorbij, setProefVoorbij] = useState(false)
  const [oprichtersOver, setOprichtersOver] = useState<number | null>(null)
  const [plan, setPlan] = useState<Plan>('jaar')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setKlaar(!!data.user))
    if (groepId) {
      supabase.from('zorggroepen').select('betaald, gestopt_op, aangemaakt_op').eq('id', groepId).single()
        .then(({ data }) => {
          if (!data) return
          const tg = toegangVan(data)
          if (tg.toegang === 'proef') setProefTot(tg.tot)
          if (tg.toegang === 'geen') setProefVoorbij(true)
        })
    }
    fetch('/api/stripe/checkout').then(r => r.json()).then(d => {
      const over = typeof d.oprichtersOver === 'number' ? d.oprichtersOver : 0
      setOprichtersOver(over)
      if (over > 0) setPlan('oprichter')
    }).catch(() => setOprichtersOver(0))
  }, [groepId])

  async function startBetaling() {
    if (!groepId) return
    setLaden(true)
    setFout(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groepId, plan }),
      })
      const data = await res.json()
      if (data.error) {
        setFout(data.error)
        setLaden(false)
        return
      }
      window.location.href = data.url
    } catch {
      setFout(t('algemeen.lukteNiet'))
      setLaden(false)
    }
  }

  const keuzes: { plan: Plan; titel: string; prijs: string; label: string; uitleg: string; badge?: string }[] = [
    ...(oprichtersOver && oprichtersOver > 0 ? [{
      plan: 'oprichter' as Plan,
      titel: t('betalen.oprichter'),
      prijs: euro(PRIJS.oprichter),
      label: t('betalen.oprichterLabel'),
      uitleg: t('betalen.oprichterUitleg', { jaar: euro(PRIJS.jaar), aantal: oprichtersOver }),
      badge: t('betalen.oprichterBadge', { totaal: PRIJS.oprichterPlekken }),
    }] : []),
    {
      plan: 'jaar',
      titel: t('betalen.jaar'),
      prijs: euro(PRIJS.jaar),
      label: t('betalen.jaarLabel'),
      uitleg: t('betalen.jaarUitleg', { maand: euro(JAAR_PER_MAAND) }),
    },
    {
      plan: 'maand',
      titel: t('betalen.maand'),
      prijs: euro(PRIJS.maandStart),
      label: t('betalen.maandLabel'),
      uitleg: t('betalen.maandUitleg', { aantal: PRIJS.startMaanden, prijs: euro(PRIJS.maand) }),
    },
  ]

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">{t('betalen.titel')}</h1>
        <p className="text-gray-600">
          <MetVet tekst={t('betalen.activeer')} waarde={groepNaam} sleutel="groep" />
        </p>
      </div>

      {proefTot && (
        <div className="rounded-caroo bg-caroo-groen-licht border border-caroo-groen px-4 py-3 mb-5 text-sm text-caroo-donker font-medium">
          🎁 {t('betalen.proefLoopt', { datum: datum(proefTot, { day: 'numeric', month: 'long' }) })}
        </div>
      )}
      {proefVoorbij && (
        <div className="rounded-caroo bg-caroo-oranje-licht border border-caroo-oranje px-4 py-3 mb-5 text-sm text-caroo-donker font-medium">
          ⏰ {t('betalen.proefVoorbij')}
        </div>
      )}

      <fieldset className="space-y-3 mb-6">
        <legend className="sr-only">{t('betalen.titel')}</legend>
        {oprichtersOver === null && <div className="caroo-card h-24 animate-pulse" />}
        {oprichtersOver !== null && keuzes.map(k => (
          <label
            key={k.plan}
            className={`caroo-card block cursor-pointer border-2 transition-colors ${
              plan === k.plan ? 'border-caroo-groen bg-caroo-groen-licht' : 'border-gray-200'
            }`}
          >
            <input type="radio" name="plan" value={k.plan} checked={plan === k.plan} onChange={() => setPlan(k.plan)} className="sr-only" />
            {k.badge && (
              <span className="inline-block mb-2 bg-caroo-oranje-licht text-caroo-oranje-tekst text-xs font-bold px-2.5 py-1 rounded-full">{k.badge}</span>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold text-caroo-donker">{k.titel}</span>
              <span className="whitespace-nowrap">
                <span className="text-2xl font-bold text-caroo-donker">{k.prijs}</span>{' '}
                <span className="text-sm text-gray-600">{k.label}</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{k.uitleg}</p>
            <p className="text-sm text-gray-600 mt-1">{k.plan === 'maand' ? t('betalen.opzegMaand') : t('betalen.opzegJaar')}</p>
          </label>
        ))}
      </fieldset>

      <div className="text-sm text-gray-600 mb-6">
        <p>{t('betalen.methodes')}</p>
        <p className="mt-1">{t('betalen.veilig')}</p>
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 mb-4 text-sm">{fout}</div>
      )}

      <button
        onClick={startBetaling}
        disabled={laden || !klaar || !groepId || oprichtersOver === null}
        className="btn-primary w-full text-lg py-4"
      >
        {laden ? t('betalen.doorsturen') : t('betalen.verder')}
      </button>
    </div>
  )
}
