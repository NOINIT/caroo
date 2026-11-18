'use client'

import { useState } from 'react'
import { meldAanOpWachtlijst } from '@/app/wachtlijst/actions'
import { WL, type WlTaal } from '@/lib/wachtlijst-teksten'

const KEUZES = ['moeder', 'vader', 'opa_oma', 'partner', 'mezelf', 'anders'] as const

export function WachtlijstFormulier({ bron, taal = 'nl' }: { bron: string; taal?: WlTaal }) {
  const f = WL[taal].form
  const [voorWie, setVoorWie] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState<{ voornaam: string; alAangemeld?: boolean } | null>(null)

  async function verstuur(formData: FormData) {
    setBezig(true)
    setFout('')
    formData.set('voor_wie', voorWie)
    formData.set('taal', taal)
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
          {klaar.alAangemeld ? f.alErop : f.erop}
          {klaar.voornaam ? `, ${klaar.voornaam}` : ''}
        </h2>
        <p className="text-gray-700 leading-relaxed">
          {klaar.alAangemeld ? f.bijgewerkt : f.gemaild} {f.lancering}
        </p>
      </div>
    )
  }

  return (
    <form action={verstuur} className="rounded-caroo-lg border border-gray-200 shadow-sm p-6 bg-white space-y-4">
      <h2 className="text-xl font-bold">{f.kop}</h2>

      <input type="hidden" name="bron" value={bron} />
      <div className="hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div>
        <label htmlFor="wl-naam" className="input-label">{f.naam}</label>
        <input id="wl-naam" name="naam" required maxLength={80} autoComplete="name" className="input-field" />
      </div>
      <div>
        <label htmlFor="wl-email" className="input-label">{f.email}</label>
        <input id="wl-email" name="email" type="email" required maxLength={200} autoComplete="email" className="input-field" />
      </div>

      <fieldset>
        <legend className="input-label">{f.voorWie} <span className="font-normal text-gray-600">{f.overslaan}</span></legend>
        <div className="flex flex-wrap gap-2 mt-1">
          {KEUZES.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setVoorWie(voorWie === k ? '' : k)}
              aria-pressed={voorWie === k}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                voorWie === k
                  ? 'bg-caroo-groen border-caroo-groen text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-caroo-groen'
              }`}
            >
              {f.keuzes[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex gap-3 items-start text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" name="wil_updates" className="mt-0.5 w-5 h-5 accent-caroo-groen flex-shrink-0" />
        <span>{f.updates}</span>
      </label>

      {fout && <p className="text-sm text-red-600" role="alert">{fout}</p>}

      <button type="submit" disabled={bezig} className="btn-primary w-full py-3.5 text-base">
        {bezig ? f.bezig : f.knop}
      </button>

      <p className="text-xs text-gray-600 leading-relaxed">
        {f.uitleg}{' '}
        <a href="/privacy" target="_blank" className="underline">{f.privacyLink}</a>.
      </p>
    </form>
  )
}
