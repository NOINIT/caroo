'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'

interface Entry {
  id: string
  inhoud: string
  gesproken: boolean
  aangemaakt_op: string
  users: { naam: string } | null
  auteur_naam?: string | null
}

interface Props {
  groepId: string
  entries: Entry[]
}


export function DagboekClient({ groepId, entries: initieel }: Props) {
  const [entries, setEntries] = useState(initieel)
  const [toonFormulier, setToonFormulier] = useState(false)
  const [inhoud, setInhoud] = useState('')
  const [laden, setLaden] = useState(false)
  const [uitgebreid, setUitgebreid] = useState<string | null>(null)
  const { t, datum, tijd } = useT()

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('dagboek').insert({
      groep_id: groepId,
      inhoud,
      gesproken: false,
      auteur_id: user.id,
    }).select('id, inhoud, gesproken, aangemaakt_op, auteur_naam, users (naam)').single()

    if (data) {
      setEntries(prev => [data as any, ...prev])
    }

    setInhoud('')
    setToonFormulier(false)
    setLaden(false)
  }

  // Groepeer per maand
  const perMaand: Record<string, Entry[]> = {}
  entries.forEach(e => {
    const maand = datum(e.aangemaakt_op, { month: 'long', year: 'numeric' })
    if (!perMaand[maand]) perMaand[maand] = []
    perMaand[maand].push(e)
  })

  return (
    <div className="px-4 py-4">
      <button
        onClick={() => setToonFormulier(!toonFormulier)}
        className="btn-primary w-full mb-4"
      >
        {toonFormulier ? t('algemeen.annuleren') : t('dagboek.nieuw')}
      </button>

      {toonFormulier && (
        <form onSubmit={voegToe} className="caroo-card mb-4 space-y-3">
          <div>
            <label className="input-label">{t('dagboek.aantekening')}</label>
            <textarea
              value={inhoud}
              onChange={e => setInhoud(e.target.value)}
              required
              className="input-field h-28 resize-none"
              placeholder={t('dagboek.placeholder')}
            />
          </div>
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? t('algemeen.opslaanBezig') : t('algemeen.opslaan')}
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">📖</p>
          <p className="text-gray-500">{t('dagboek.leeg')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('dagboek.eerste')}</p>
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
                          {datum(entry.aangemaakt_op, { weekday: 'long', day: 'numeric', month: 'short' })} · {tijd(entry.aangemaakt_op)}
                          {(entry.users?.naam || entry.auteur_naam) && ` · ${entry.users?.naam || entry.auteur_naam}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {entry.gesproken && (
                          <span title={t('dagboek.viaSpraak')} className="text-xs text-gray-300">🎤</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-caroo-donker leading-relaxed whitespace-pre-wrap">
                      {preview}
                    </p>
                    {entry.inhoud.length > 80 && (
                      <p className="text-xs text-caroo-groen mt-1">
                        {isUitgebreid ? t('dagboek.minder') : t('dagboek.meer')}
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
