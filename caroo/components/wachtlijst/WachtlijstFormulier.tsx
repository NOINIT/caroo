'use client'

import { useState } from 'react'
import { meldAanOpWachtlijst } from '@/app/wachtlijst/actions'
import { MERK } from '@/lib/merk'

const KEUZES = [
  { waarde: 'moeder', label: 'Mijn moeder' },
  { waarde: 'vader', label: 'Mijn vader' },
  { waarde: 'opa_oma', label: 'Opa of oma' },
  { waarde: 'partner', label: 'Mijn partner' },
  { waarde: 'anders', label: 'Iemand anders' },
]

export function WachtlijstFormulier({ bron }: { bron: string }) {
  const [voorWie, setVoorWie] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState<{ voornaam: string; alAangemeld?: boolean } | null>(null)

  async function verstuur(formData: FormData) {
    setBezig(true)
    setFout('')
    formData.set('voor_wie', voorWie)
    const r = await meldAanOpWachtlijst(formData)
    if ('error' in r && r.error) setFout(r.error)
    else if ('succes' in r) setKlaar({ voornaam: r.voornaam || '', alAangemeld: 'alAangemeld' in r ? r.alAangemeld : false })
    setBezig(false)
  }

  if (klaar) {
    return (
      <div className="rounded-caroo-lg border-2 border-caroo-groen bg-caroo-groen-licht p-6" role="status">
        <p className="text-4xl mb-3" aria-hidden>🎉</p>
        <h2 className="text-2xl font-bold mb-2">
          {klaar.alAangemeld ? 'Je stond er al op' : 'Je staat erop'}
          {klaar.voornaam ? `, ${klaar.voornaam}` : ''}
        </h2>
        <p className="text-gray-700 leading-relaxed">
          {klaar.alAangemeld
            ? 'We hebben je gegevens bijgewerkt.'
            : 'We hebben je een bevestiging gemaild. Kijk ook even bij ongewenste mail.'}{' '}
          Op {MERK.lancering} hoor je als eerste van ons.
        </p>
      </div>
    )
  }

  return (
    <form action={verstuur} className="rounded-caroo-lg border border-gray-200 shadow-sm p-6 bg-white space-y-4">
      <h2 className="text-xl font-bold">Zet me op de wachtlijst</h2>

      <input type="hidden" name="bron" value={bron} />
      <div className="hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div>
        <label htmlFor="wl-naam" className="input-label">Je naam</label>
        <input id="wl-naam" name="naam" required maxLength={80} autoComplete="name" className="input-field" />
      </div>
      <div>
        <label htmlFor="wl-email" className="input-label">E-mailadres</label>
        <input id="wl-email" name="email" type="email" required maxLength={200} autoComplete="email" className="input-field" />
      </div>

      <fieldset>
        <legend className="input-label">Voor wie zoek je dit? <span className="font-normal text-gray-400">(mag je overslaan)</span></legend>
        <div className="flex flex-wrap gap-2 mt-1">
          {KEUZES.map(k => (
            <button
              key={k.waarde}
              type="button"
              onClick={() => setVoorWie(voorWie === k.waarde ? '' : k.waarde)}
              aria-pressed={voorWie === k.waarde}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                voorWie === k.waarde
                  ? 'bg-caroo-groen border-caroo-groen text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-caroo-groen'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex gap-3 items-start text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" name="wil_updates" className="mt-0.5 w-5 h-5 accent-caroo-groen flex-shrink-0" />
        <span>Stuur me ook af en toe nieuws over {MERK.naam}. Afmelden kan altijd.</span>
      </label>

      {fout && <p className="text-sm text-red-600" role="alert">{fout}</p>}

      <button type="submit" disabled={bezig} className="btn-primary w-full py-3.5 text-base">
        {bezig ? 'Even geduld...' : 'Zet me op de wachtlijst'}
      </button>

      <p className="text-xs text-gray-400 leading-relaxed">
        We gebruiken je gegevens alleen voor de wachtlijst en, als je dat aanvinkt, voor nieuws over {MERK.naam}.
      </p>
    </form>
  )
}
