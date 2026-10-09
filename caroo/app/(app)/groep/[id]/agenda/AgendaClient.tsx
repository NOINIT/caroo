'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Categorie {
  id: string
  naam: string
  kleur: string
  systeem: boolean
}

interface Afspraak {
  id: string
  titel: string
  beschrijving: string | null
  start_tijd: string
  eind_tijd: string | null
  agenda_categorieen: Categorie | null
}

interface Props {
  groepId: string
  afspraken: Afspraak[]
  categorieen: Categorie[]
}

export function AgendaClient({ groepId, afspraken: initieel, categorieen }: Props) {
  const [afspraken, setAfspraken] = useState(initieel)
  const [toonFormulier, setToonFormulier] = useState(false)
  const [laden, setLaden] = useState(false)
  const [nieuw, setNieuw] = useState({
    titel: '',
    beschrijving: '',
    start_tijd: '',
    eind_tijd: '',
    categorie_id: categorieen[0]?.id || '',
  })

  const maandenSet = new Set(afspraken.map(a =>
    new Date(a.start_tijd).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
  ))
  const maanden = Array.from(maandenSet)

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('afspraken').insert({
      groep_id: groepId,
      titel: nieuw.titel,
      beschrijving: nieuw.beschrijving || null,
      start_tijd: nieuw.start_tijd,
      eind_tijd: nieuw.eind_tijd || null,
      categorie_id: nieuw.categorie_id || null,
      aangemaakt_door: user.id,
    }).select(`
      id, titel, beschrijving, start_tijd, eind_tijd,
      agenda_categorieen (id, naam, kleur)
    `).single()

    if (data) {
      setAfspraken(prev => [...prev, data as any].sort((a, b) =>
        new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime()
      ))
    }

    setNieuw({ titel: '', beschrijving: '', start_tijd: '', eind_tijd: '', categorie_id: categorieen[0]?.id || '' })
    setToonFormulier(false)
    setLaden(false)
  }

  async function verwijder(id: string) {
    const supabase = createClient()
    await supabase.from('afspraken').delete().eq('id', id)
    setAfspraken(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="px-4 py-4">
      {/* Categorieën legenda */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categorieen.map(cat => (
          <span
            key={cat.id}
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: cat.kleur }}
          >
            {cat.naam}
          </span>
        ))}
      </div>

      {/* Knop nieuwe afspraak */}
      <button
        onClick={() => setToonFormulier(!toonFormulier)}
        className="btn-primary w-full mb-4"
      >
        {toonFormulier ? 'Annuleren' : '＋ Afspraak toevoegen'}
      </button>

      {/* Formulier */}
      {toonFormulier && (
        <form onSubmit={voegToe} className="caroo-card mb-4 space-y-3">
          <div>
            <label className="input-label">Titel</label>
            <input
              type="text"
              value={nieuw.titel}
              onChange={e => setNieuw(p => ({ ...p, titel: e.target.value }))}
              required
              className="input-field"
              placeholder="bijv. Cardioloog"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="input-label">Begin</label>
              <input
                type="datetime-local"
                value={nieuw.start_tijd}
                onChange={e => setNieuw(p => ({ ...p, start_tijd: e.target.value }))}
                required
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="input-label">Eind (optioneel)</label>
              <input
                type="datetime-local"
                value={nieuw.eind_tijd}
                onChange={e => setNieuw(p => ({ ...p, eind_tijd: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
          </div>
          <div>
            <label className="input-label">Categorie</label>
            <select
              value={nieuw.categorie_id}
              onChange={e => setNieuw(p => ({ ...p, categorie_id: e.target.value }))}
              className="input-field"
            >
              {categorieen.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.naam}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Notitie (optioneel)</label>
            <textarea
              value={nieuw.beschrijving}
              onChange={e => setNieuw(p => ({ ...p, beschrijving: e.target.value }))}
              className="input-field h-20 resize-none"
              placeholder="bijv. Adres, telefoonnummer..."
            />
          </div>
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {/* Lijst per maand */}
      {afspraken.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-gray-500">Nog geen afspraken</p>
        </div>
      ) : (
        maanden.map(maand => (
          <div key={maand} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 capitalize">
              {maand}
            </h2>
            <div className="space-y-2">
              {afspraken
                .filter(a => new Date(a.start_tijd).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }) === maand)
                .map(af => (
                  <div key={af.id} className="caroo-card flex gap-3 items-start">
                    <div
                      className="w-1 rounded-full flex-shrink-0 mt-1"
                      style={{
                        backgroundColor: af.agenda_categorieen?.kleur || '#1A7A6E',
                        minHeight: '40px'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-caroo-donker truncate">{af.titel}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(af.start_tijd).toLocaleDateString('nl-NL', {
                          weekday: 'short', day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      {af.beschrijving && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{af.beschrijving}</p>
                      )}
                      {af.agenda_categorieen && (
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded text-white mt-1 inline-block"
                          style={{ backgroundColor: af.agenda_categorieen.kleur }}
                        >
                          {af.agenda_categorieen.naam}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => verwijder(af.id)}
                      className="text-gray-300 hover:text-red-400 text-lg flex-shrink-0"
                      aria-label="Verwijderen"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
