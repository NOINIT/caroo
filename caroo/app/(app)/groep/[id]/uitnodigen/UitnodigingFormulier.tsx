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
  oudere: 'Oudere',
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
      setUitnodigingen(prev => [data.uitnodiging, ...prev])
      setEmail('')
    }

    setLaden(false)
  }

  function kopieerLink() {
    navigator.clipboard.writeText(link)
  }

  const isVerlopen = (datum: string) => new Date(datum) < new Date()

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
            <option value="oudere">Oudere (gebruikt magische link)</option>
            <option value="groepsbeheerder">Groepsbeheerder</option>
          </select>
        </div>

        {fout && <p className="error-text">{fout}</p>}

        <button type="submit" disabled={laden} className="btn-primary w-full">
          {laden ? 'Link aanmaken...' : 'Uitnodigingslink aanmaken'}
        </button>
      </form>

      {/* Gegenereerde link */}
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
        </div>
      )}

      {/* Vorige uitnodigingen */}
      {uitnodigingen.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Eerdere uitnodigingen
          </h2>
          <div className="space-y-2">
            {uitnodigingen.map(u => (
              <div key={u.id} className="caroo-card flex items-center gap-3">
                <span className="text-lg">
                  {u.gebruikt ? '✅' : isVerlopen(u.verloopt_op) ? '⏰' : '📨'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-caroo-donker truncate">{u.email}</p>
                  <p className="text-xs text-gray-500">
                    {rolLabels[u.rol]} ·{' '}
                    {u.gebruikt
                      ? 'Geaccepteerd'
                      : isVerlopen(u.verloopt_op)
                      ? 'Verlopen'
                      : `Geldig t/m ${new Date(u.verloopt_op).toLocaleDateString('nl-NL')}`}
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
