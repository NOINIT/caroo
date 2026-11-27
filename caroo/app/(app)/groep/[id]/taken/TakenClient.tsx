'use client'

import { useVolg } from '@/lib/useVolg'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'
import { zetTaakGedaan, zetTaakInAgenda, netGedaan } from '@/lib/taken-client'

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
  toegewezen: { naam: string } | null
  voltooid_op?: string | null
  voltooider?: { naam: string } | null
}

interface Props {
  groepId: string
  taken: Taak[]
  leden: Lid[]
}

export function TakenClient({ groepId, taken: initieel, leden }: Props) {
  const [taken, setTaken] = useVolg(initieel)
  const [toonFormulier, setToonFormulier] = useState(false)
  const [laden, setLaden] = useState(false)
  const [filter, setFilter] = useState<'open' | 'voltooid'>('open')
  const { t, datum } = useT()
  const [nieuw, setNieuw] = useState({
    titel: '',
    beschrijving: '',
    deadline: '',
    toegewezen_aan: '',
  })

  // Bij open: ook wat net is afgevinkt, doorgestreept met wie het deed. Zo verdwijnt een taak niet ineens.
  const gefilterd = taken.filter(tk => filter === 'open' ? (!tk.voltooid || netGedaan(tk.voltooid_op)) : tk.voltooid)
  const [inAgenda, setInAgenda] = useState<string[]>([])

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
      id, titel, beschrijving, deadline, voltooid, voltooid_op, aangemaakt_op, toegewezen_aan,
      toegewezen:users!taken_toegewezen_aan_fkey (naam),
      voltooider:users!taken_voltooid_door_fkey (naam)
    `).single()

    if (data) {
      setTaken(prev => [data as any, ...prev])
    }

    setNieuw({ titel: '', beschrijving: '', deadline: '', toegewezen_aan: '' })
    setToonFormulier(false)
    setLaden(false)
  }

  async function toggleVoltooid(taakId: string, huidig: boolean) {
    const gedaan = !huidig
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const mijnNaam = leden.find(l => l.id === user?.id)?.naam || ''
    setTaken(prev => prev.map(tk => tk.id === taakId
      ? { ...tk, voltooid: gedaan, voltooid_op: gedaan ? new Date().toISOString() : null, voltooider: gedaan ? { naam: mijnNaam } : null }
      : tk))
    await zetTaakGedaan(taakId, gedaan)
  }

  async function naarAgenda(taak: Taak) {
    if (await zetTaakInAgenda(groepId, taak.titel, taak.deadline)) setInAgenda(prev => [...prev, taak.id])
  }

  async function verwijder(taakId: string) {
    const supabase = createClient()
    await supabase.from('taken').delete().eq('id', taakId)
    setTaken(prev => prev.filter(tk => tk.id !== taakId))
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
          {t('taken.open', { aantal: taken.filter(tk => !tk.voltooid).length })}
        </button>
        <button
          onClick={() => setFilter('voltooid')}
          className={`flex-1 py-2 rounded-caroo text-sm font-medium transition-colors ${
            filter === 'voltooid'
              ? 'bg-caroo-groen text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {t('taken.gedaan', { aantal: taken.filter(tk => tk.voltooid).length })}
        </button>
      </div>

      <button
        onClick={() => setToonFormulier(!toonFormulier)}
        className="btn-primary w-full mb-4"
      >
        {toonFormulier ? t('algemeen.annuleren') : t('taken.toevoegen')}
      </button>

      {/* Formulier */}
      {toonFormulier && (
        <form onSubmit={voegToe} className="caroo-card mb-4 space-y-3">
          <div>
            <label className="input-label">{t('taken.omschrijving')}</label>
            <input
              type="text"
              value={nieuw.titel}
              onChange={e => setNieuw(p => ({ ...p, titel: e.target.value }))}
              required
              className="input-field"
              placeholder={t('taken.voorbeeld')}
            />
          </div>
          <div>
            <label className="input-label">{t('agenda.notitie')}</label>
            <input
              type="text"
              value={nieuw.beschrijving}
              onChange={e => setNieuw(p => ({ ...p, beschrijving: e.target.value }))}
              className="input-field"
              placeholder={t('taken.voorbeeldNotitie')}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="input-label">{t('taken.deadline')}</label>
              <input
                type="date"
                value={nieuw.deadline}
                onChange={e => setNieuw(p => ({ ...p, deadline: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="input-label">{t('taken.toewijzen')}</label>
              <select
                value={nieuw.toegewezen_aan}
                onChange={e => setNieuw(p => ({ ...p, toegewezen_aan: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">{t('taken.niemand')}</option>
                {leden.map(lid => (
                  <option key={lid.id} value={lid.id}>{lid.naam}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? t('algemeen.opslaanBezig') : t('algemeen.opslaan')}
          </button>
        </form>
      )}

      {/* Takenlijst */}
      {gefilterd.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-2">{filter === 'open' ? '✅' : '📋'}</p>
          <p className="text-gray-600">
            {filter === 'open' ? t('taken.geenOpen') : t('taken.nietsAfgerond')}
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
                  aria-label={taak.voltooid ? t('taken.markeerOpen') : t('taken.markeerGedaan')}
                >
                  {taak.voltooid ? '✅' : '⬜'}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-caroo-donker ${taak.voltooid ? 'line-through' : ''}`}>
                    {taak.titel}
                  </p>
                  {taak.beschrijving && (
                    <p className="text-sm text-gray-600 mt-0.5">{taak.beschrijving}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {taak.deadline && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isOverdue
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        📅 {datum(taak.deadline, { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {taak.toegewezen?.naam && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-caroo-groen-licht text-caroo-donker">
                        👤 {taak.toegewezen.naam}
                      </span>
                    )}
                    {taak.voltooid && taak.voltooider?.naam && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-caroo-groen-licht text-caroo-groen">
                        {t('taken.gedaanDoor', { naam: taak.voltooider.naam })}
                      </span>
                    )}
                  </div>
                  {!taak.voltooid && (
                    inAgenda.includes(taak.id)
                      ? <p className="text-xs text-caroo-groen mt-1">{t('taken.inAgendaKlaar')}</p>
                      : <button onClick={() => naarAgenda(taak)} className="text-xs text-caroo-groen underline mt-1">{t('taken.inAgenda')}</button>
                  )}
                </div>
                <button
                  onClick={() => verwijder(taak.id)}
                  className="text-gray-500 hover:text-red-600 text-lg flex-shrink-0"
                  aria-label={t('algemeen.verwijderen')}
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
