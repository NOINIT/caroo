'use client'

import { useState } from 'react'

interface Uitnodiging {
  id: string
  email: string
  rol: string
  gebruikt: boolean
  verloopt_op: string
  aangemaakt_op: string
}

interface Props {
  groepId: string
  groepNaam: string
  uitnodigingen: Uitnodiging[]
}

const rolLabels: Record<string, string> = {
  mantelzorger: 'Mantelzorger',
  oudere: 'Hoofdpersoon',
  groepsbeheerder: 'Groepsbeheerder',
}

export function UitnodigingFormulier({ groepId, groepNaam, uitnodigingen: initieel }: Props) {
  const [uitnodigingen, setUitnodigingen] = useState(initieel)
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('mantelzorger')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState('')
  const [link, setLink] = useState('')

  async function stuurUitnodiging(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')
    setLink('')

    const res = await fetch('/api/uitnodiging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groepId, email, rol }),
    })

    const data = await res.json()

    if (!res.ok) {
      setFout(data.error || 'Er ging iets mis')
    } else {
      setLink(data.link)
      // Een nieuwe uitnodiging vervangt een openstaande naar hetzelfde adres
      setUitnodigingen(prev => [data.uitnodiging, ...prev.filter(u => u.email.toLowerCase() !== data.uitnodiging.email.toLowerCase())])
      setEmail('')
    }

    setLaden(false)
  }

  function kopieerLink() {
    navigator.clipboard.writeText(link)
  }

  const isVerlopen = (datum: string) => new Date(datum) < new Date()
  const openstaand = uitnodigingen.filter(u => !u.gebruikt && !isVerlopen(u.verloopt_op))

  return (
    <div className="px-4 py-4">
      <div className="bg-caroo-groen-licht rounded-caroo p-3 mb-4">
        <p className="text-sm text-caroo-donker">
          👥 Nodig mensen uit voor <strong>{groepNaam}</strong>. Ze ontvangen een persoonlijke link die 7 dagen geldig is.
        </p>
      </div>

      <form onSubmit={stuurUitnodiging} className="caroo-card mb-4 space-y-3">
        <div>
          <label className="input-label">E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input-field"
            placeholder="naam@voorbeeld.nl"
          />
        </div>
        <div>
          <label className="input-label">Rol</label>
          <select
            value={rol}
            onChange={e => setRol(e.target.value)}
            className="input-field"
          >
            <option value="mantelzorger">Mantelzorger</option>
            <option value="oudere">Hoofdpersoon (inloggen zonder wachtwoord)</option>
            <option value="groepsbeheerder">Groepsbeheerder</option>
          </select>
        </div>

        {fout && <p className="error-text">{fout}</p>}

        <button type="submit" disabled={laden} className="btn-primary w-full">
          {laden ? 'Link aanmaken...' : 'Uitnodigingslink aanmaken'}
        </button>
      </form>

      {link && (
        <div className="caroo-card mb-4 bg-caroo-groen-licht border border-caroo-groen">
          <p className="text-sm font-medium text-caroo-donker mb-2">✅ Link aangemaakt!</p>
          <p className="text-xs text-gray-600 mb-3">
            Stuur deze link naar de persoon die je uitnodigt. De link verloopt over 7 dagen.
          </p>
          <div className="bg-white rounded p-2 text-xs text-gray-700 break-all mb-2 font-mono">
            {link}
          </div>
          <button onClick={kopieerLink} className="btn-secondary w-full text-sm">
            📋 Kopieer link
          </button>
          <div className="flex gap-2 mt-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Je bent uitgenodigd voor de zorggroep ${groepNaam} op Clanoo. Gebruik deze link om mee te doen: ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-caroo py-2 text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.528 5.855L0 24l6.302-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.372l-.359-.214-3.722.976.993-3.628-.234-.373A9.818 9.818 0 1112 21.818z"/></svg>
              WhatsApp
            </a>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(`Uitnodiging voor zorggroep ${groepNaam}`)}&body=${encodeURIComponent(`Hallo,\n\nJe bent uitgenodigd voor de zorggroep ${groepNaam} op Clanoo.\n\nKlik op de link om mee te doen:\n${link}\n\nDeze link is 7 dagen geldig.`)}`}
              className="flex-1 flex items-center justify-center gap-2 bg-caroo-groen text-white rounded-caroo py-2 text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              E-mail
            </a>
          </div>
        </div>
      )}

      {openstaand.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Wacht op reactie
          </h2>
          <p className="text-xs text-gray-400 mb-2">
            Wie de uitnodiging heeft geaccepteerd, zie je bij Beheer in de ledenlijst.
          </p>
          <div className="space-y-2">
            {openstaand.map(u => (
              <div key={u.id} className="caroo-card flex items-center gap-3">
                <span className="text-lg">📨</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-caroo-donker truncate">{u.email}</p>
                  <p className="text-xs text-gray-500">
                    {rolLabels[u.rol]} · Geldig t/m {new Date(u.verloopt_op).toLocaleDateString('nl-NL')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
