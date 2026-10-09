'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Lid {
  id: string
  naam: string
}

interface Taak {
  id: string
  titel: string
  beschrijving: string | null
  deadline: string | null
  voltooid: boolean
  aangemaakt_op: string
  toegewezen_aan: string | null
  groepsleden: { users: { naam: string } } | null
}

interface Props {
  groepId: string
  taken: Taak[]
  leden: Lid[]
}

export function TakenClient({ groepId, taken: initieel, leden }: Props) {
  const [taken, setTaken] = useState(initieel)
  const [toonFormulier, setToonFormulier] = useState(false)
  const [laden, setLaden] = useState(false)
  const [filter, setFilter] = useState<'open' | 'voltooid'>('open')
  const [nieuw, setNieuw] = useState({
    titel: '',
    beschrijving: '',
    deadline: '',
    toegewezen_aan: '',
  })

  const gefilterd = taken.filter(t => filter === 'open' ? !t.voltooid : t.voltooid)

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('taken').insert({
      groep_id: groepId,
      titel: nieuw.titel,
      beschrijving: nieuw.beschrijving || null,
      deadline: nieuw.deadline || null,
      toegewezen_aan: nieuw.toegewezen_aan || null,
      aangemaakt_door: user.id,
    }).select(`
      id, titel, beschrijving, deadline, voltooid, aangemaakt_op, toegewezen_aan,
      groepsleden (users (naam))
    `).single()

    if (data) {
      setTaken(prev => [data as any, ...prev])
    }

    setNieuw({ titel: '', beschrijving: '', deadline: '', toegewezen_aan: '' })
    setToonFormulier(false)
    setLaden(false)
  }

  async function toggleVoltooid(taakId: string, huidig: boolean) {
    const supabase = createClient()
    await supabase.from('taken').update({ voltooid: !huidig }).eq('id', taakId)
    setTaken(prev => prev.map(t => t.id === taakId ? { ...t, voltooid: !huidig } : t))
  }

  async function verwijder(taakId: string) {
    const supabase = createClient()
    await supabase.from('taken').delete().eq('id', taakId)
    setTaken(prev => prev.filter(t => t.id !== taakId))
  }

  return (
    <div className="px-4 py-4">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('open')}
          className={`flex-1 py-2 rounded-caroo text-sm font-medium transition-colors ${
            filter === 'open'
              ? 'bg-caroo-groen text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Open ({taken.filter(t => !t.voltooid).length})
        </button>
        <button
          onClick={() => setFilter('voltooid')}
          className={`flex-1 py-2 rounded-caroo text-sm font-medium transition-colors ${
            filter === 'voltooid'
              ? 'bg-caroo-groen text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Gedaan ({taken.filter(t => t.voltooid).length})
        </button>
      </div>

      <button
        onClick={() => setToonFormulier(!toonFormulier)}
        className="btn-primary w-full mb-4"
      >
        {toonFormulier ? 'Annuleren' : '＋ Taak toevoegen'}
      </button>

      {/* Formulier */}
      {toonFormulier && (
        <form onSubmit={voegToe} className="caroo-card mb-4 space-y-3">
          <div>
            <label className="input-label">Omschrijving</label>
            <input
              type="text"
              value={nieuw.titel}
              onChange={e => setNieuw(p => ({ ...p, titel: e.target.value }))}
              required
              className="input-field"
              placeholder="bijv. Boodschappen doen"
            />
          </div>
          <div>
            <label className="input-label">Notitie (optioneel)</label>
            <input
              type="text"
              value={nieuw.beschrijving}
              onChange={e => setNieuw(p => ({ ...p, beschrijving: e.target.value }))}
              className="input-field"
              placeholder="bijv. Melk, brood en groente"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="input-label">Deadline (optioneel)</label>
              <input
                type="date"
                value={nieuw.deadline}
                onChange={e => setNieuw(p => ({ ...p, deadline: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="input-label">Toewijzen aan</label>
              <select
                value={nieuw.toegewezen_aan}
                onChange={e => setNieuw(p => ({ ...p, toegewezen_aan: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">Niemand</option>
                {leden.map(lid => (
                  <option key={lid.id} value={lid.id}>{lid.naam}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {/* Takenlijst */}
      {gefilterd.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-2">{filter === 'open' ? '✅' : '📋'}</p>
          <p className="text-gray-500">
            {filter === 'open' ? 'Geen open taken' : 'Nog niets afgerond'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {gefilterd.map(taak => {
            const isOverdue = taak.deadline && !taak.voltooid &&
              new Date(taak.deadline) < new Date()

            return (
              <div
                key={taak.id}
                className={`caroo-card flex gap-3 items-start ${taak.voltooid ? 'opacity-60' : ''}`}
              >
                <button
                  onClick={() => toggleVoltooid(taak.id, taak.voltooid)}
                  className="mt-0.5 text-2xl flex-shrink-0"
                  aria-label={taak.voltooid ? 'Markeer als open' : 'Markeer als gedaan'}
                >
                  {taak.voltooid ? '✅' : '⬜'}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-caroo-donker ${taak.voltooid ? 'line-through' : ''}`}>
                    {taak.titel}
                  </p>
                  {taak.beschrijving && (
                    <p className="text-sm text-gray-500 mt-0.5">{taak.beschrijving}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {taak.deadline && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isOverdue
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        📅 {new Date(taak.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {taak.groepsleden?.users?.naam && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-caroo-groen-licht text-caroo-donker">
                        👤 {taak.groepsleden.users.naam}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => verwijder(taak.id)}
                  className="text-gray-300 hover:text-red-400 text-lg flex-shrink-0"
                  aria-label="Verwijderen"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
