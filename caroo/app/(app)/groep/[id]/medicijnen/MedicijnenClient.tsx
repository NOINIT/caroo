'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Medicijn {
  id: string
  naam: string
  dosering: string
  tijdstippen: string[]
  opmerkingen: string | null
  actief: boolean
}

interface Registratie {
  medicijn_id: string
  tijdstip: string
  ingenomen: boolean
}

interface Props {
  groepId: string
  medicijnen: Medicijn[]
  registratiesVandaag: Registratie[]
  vandaag: string
}

export function MedicijnenClient({ groepId, medicijnen: initieel, registratiesVandaag: initieelReg, vandaag }: Props) {
  const [medicijnen, setMedicijnen] = useState(initieel)
  const [registraties, setRegistraties] = useState(initieelReg)
  const [toonFormulier, setToonFormulier] = useState(false)
  const [laden, setLaden] = useState(false)
  const [nieuw, setNieuw] = useState({
    naam: '',
    dosering: '',
    tijdstippen: '08:00',
    opmerkingen: '',
  })

  function isIngenomen(medicijnId: string, tijdstip: string): boolean {
    return registraties.some(r =>
      r.medicijn_id === medicijnId &&
      r.tijdstip === tijdstip &&
      r.ingenomen
    )
  }

  async function toggleInname(medicijnId: string, tijdstip: string, ingenomen: boolean) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('medicijn_registraties').upsert({
      medicijn_id: medicijnId,
      groep_id: groepId,
      datum: vandaag,
      tijdstip,
      ingenomen: !ingenomen,
      geregistreerd_door: user.id,
    }, { onConflict: 'medicijn_id,datum,tijdstip' })

    setRegistraties(prev => {
      const bestaand = prev.find(r => r.medicijn_id === medicijnId && r.tijdstip === tijdstip)
      if (bestaand) {
        return prev.map(r =>
          r.medicijn_id === medicijnId && r.tijdstip === tijdstip
            ? { ...r, ingenomen: !ingenomen }
            : r
        )
      }
      return [...prev, { medicijn_id: medicijnId, tijdstip, ingenomen: !ingenomen }]
    })
  }

  async function voegMedicijnToe(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const tijdstippen = nieuw.tijdstippen.split(',').map(t => t.trim()).filter(Boolean)

    const { data } = await supabase.from('medicijnen').insert({
      groep_id: groepId,
      naam: nieuw.naam,
      dosering: nieuw.dosering,
      tijdstippen,
      opmerkingen: nieuw.opmerkingen || null,
      aangemaakt_door: user.id,
    }).select().single()

    if (data) {
      setMedicijnen(prev => [...prev, data as any])
    }

    setNieuw({ naam: '', dosering: '', tijdstippen: '08:00', opmerkingen: '' })
    setToonFormulier(false)
    setLaden(false)
  }

  return (
    <div className="px-4 py-4">
      <div className="bg-caroo-groen-licht rounded-caroo p-3 mb-4">
        <p className="text-sm text-caroo-donker">
          📅 Vandaag: {new Date(vandaag).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <button
        onClick={() => setToonFormulier(!toonFormulier)}
        className="btn-primary w-full mb-4"
      >
        {toonFormulier ? 'Annuleren' : '＋ Medicijn toevoegen'}
      </button>

      {/* Formulier */}
      {toonFormulier && (
        <form onSubmit={voegMedicijnToe} className="caroo-card mb-4 space-y-3">
          <div>
            <label className="input-label">Naam medicijn</label>
            <input
              type="text"
              value={nieuw.naam}
              onChange={e => setNieuw(p => ({ ...p, naam: e.target.value }))}
              required
              className="input-field"
              placeholder="bijv. Metformine"
            />
          </div>
          <div>
            <label className="input-label">Dosering</label>
            <input
              type="text"
              value={nieuw.dosering}
              onChange={e => setNieuw(p => ({ ...p, dosering: e.target.value }))}
              required
              className="input-field"
              placeholder="bijv. 500mg"
            />
          </div>
          <div>
            <label className="input-label">Tijdstippen (komma-gescheiden)</label>
            <input
              type="text"
              value={nieuw.tijdstippen}
              onChange={e => setNieuw(p => ({ ...p, tijdstippen: e.target.value }))}
              required
              className="input-field"
              placeholder="bijv. 08:00, 12:00, 20:00"
            />
          </div>
          <div>
            <label className="input-label">Opmerkingen (optioneel)</label>
            <input
              type="text"
              value={nieuw.opmerkingen}
              onChange={e => setNieuw(p => ({ ...p, opmerkingen: e.target.value }))}
              className="input-field"
              placeholder="bijv. Bij het eten innemen"
            />
          </div>
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {/* Medicijnlijst met innameregistratie */}
      {medicijnen.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-2">💊</p>
          <p className="text-gray-500">Nog geen medicijnen toegevoegd</p>
        </div>
      ) : (
        <div className="space-y-4">
          {medicijnen.map(med => (
            <div key={med.id} className="caroo-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-caroo-donker">{med.naam}</p>
                  <p className="text-sm text-gray-500">{med.dosering}</p>
                  {med.opmerkingen && (
                    <p className="text-xs text-gray-400 mt-0.5">{med.opmerkingen}</p>
                  )}
                </div>
                <span className="text-2xl">💊</span>
              </div>

              {/* Tijdstippen met checkboxen */}
              <div className="grid grid-cols-3 gap-2">
                {med.tijdstippen.map(tijd => {
                  const genomen = isIngenomen(med.id, tijd)
                  return (
                    <button
                      key={tijd}
                      onClick={() => toggleInname(med.id, tijd, genomen)}
                      className={`flex flex-col items-center py-2 rounded-caroo border-2 transition-all ${
                        genomen
                          ? 'bg-caroo-groen border-caroo-groen text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-caroo-groen'
                      }`}
                    >
                      <span className="text-lg">{genomen ? '✅' : '⬜'}</span>
                      <span className="text-xs font-medium mt-0.5">{tijd}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
