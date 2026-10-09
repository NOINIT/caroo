'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Entry {
  id: string
  inhoud: string
  stemming: number | null
  gesproken: boolean
  aangemaakt_op: string
  users: { naam: string } | null
}

interface Props {
  groepId: string
  entries: Entry[]
}

const stemmingEmoji = (s: number | null) => {
  if (s === null) return ''
  if (s >= 4) return '😊'
  if (s === 3) return '😐'
  return '😔'
}

export function DagboekClient({ groepId, entries: initieel }: Props) {
  const [entries, setEntries] = useState(initieel)
  const [toonFormulier, setToonFormulier] = useState(false)
  const [inhoud, setInhoud] = useState('')
  const [stemming, setStemming] = useState<number>(3)
  const [laden, setLaden] = useState(false)
  const [uitgebreid, setUitgebreid] = useState<string | null>(null)

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('dagboek').insert({
      groep_id: groepId,
      inhoud,
      stemming,
      gesproken: false,
      geschreven_door: user.id,
    }).select('id, inhoud, stemming, gesproken, aangemaakt_op, users (naam)').single()

    if (data) {
      setEntries(prev => [data as any, ...prev])
    }

    setInhoud('')
    setStemming(3)
    setToonFormulier(false)
    setLaden(false)
  }

  // Groepeer per maand
  const perMaand: Record<string, Entry[]> = {}
  entries.forEach(e => {
    const maand = new Date(e.aangemaakt_op).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    if (!perMaand[maand]) perMaand[maand] = []
    perMaand[maand].push(e)
  })

  return (
    <div className="px-4 py-4">
      <button
        onClick={() => setToonFormulier(!toonFormulier)}
        className="btn-primary w-full mb-4"
      >
        {toonFormulier ? 'Annuleren' : '✏️ Nieuwe aantekening'}
      </button>

      {toonFormulier && (
        <form onSubmit={voegToe} className="caroo-card mb-4 space-y-3">
          <div>
            <label className="input-label">Hoe gaat het?</label>
            <div className="flex gap-3 py-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStemming(s)}
                  className={`text-2xl transition-transform ${stemming === s ? 'scale-125' : 'opacity-40'}`}
                >
                  {s === 1 ? '😔' : s === 2 ? '😕' : s === 3 ? '😐' : s === 4 ? '😊' : '😄'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="input-label">Aantekening</label>
            <textarea
              value={inhoud}
              onChange={e => setInhoud(e.target.value)}
              required
              className="input-field h-28 resize-none"
              placeholder="Schrijf hier hoe het gaat, bijzonderheden of gedachten..."
            />
          </div>
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">📖</p>
          <p className="text-gray-500">Het dagboek is nog leeg</p>
          <p className="text-sm text-gray-400 mt-1">Voeg de eerste aantekening toe</p>
        </div>
      ) : (
        Object.entries(perMaand).map(([maand, maandEntries]) => (
          <div key={maand} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 capitalize">
              {maand}
            </h2>
            <div className="space-y-2">
              {maandEntries.map(entry => {
                const isUitgebreid = uitgebreid === entry.id
                const preview = entry.inhoud.length > 80 && !isUitgebreid
                  ? entry.inhoud.slice(0, 80) + '...'
                  : entry.inhoud

                return (
                  <div
                    key={entry.id}
                    className="caroo-card cursor-pointer"
                    onClick={() => setUitgebreid(isUitgebreid ? null : entry.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs text-gray-400">
                          {new Date(entry.aangemaakt_op).toLocaleDateString('nl-NL', {
                            weekday: 'long', day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit'
                          })}
                          {entry.users?.naam && ` · ${entry.users.naam}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {entry.gesproken && (
                          <span title="Via spraak ingevoerd" className="text-xs text-gray-300">🎤</span>
                        )}
                        {stemmingEmoji(entry.stemming) && (
                          <span className="text-lg">{stemmingEmoji(entry.stemming)}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-caroo-donker leading-relaxed whitespace-pre-wrap">
                      {preview}
                    </p>
                    {entry.inhoud.length > 80 && (
                      <p className="text-xs text-caroo-groen mt-1">
                        {isUitgebreid ? 'Minder tonen' : 'Meer lezen'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
