'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { stemmingInfo } from '@/lib/stemming'
import { speelGeluid } from '@/lib/geluid'

interface Stemming { naam: string | null; stemming: number; bijgewerkt_op: string }
interface Verzoek {
  id: string
  aangevraagd_naam: string | null
  aangemaakt_op: string
  reactie_naam: string | null
  reactie_wanneer: string | null
}

const SNELKEUZES = ['binnen een uur', 'vanmiddag', 'vanavond', 'morgen']

interface Props {
  mijnNaam: string
  mijnId: string
  stemmingen: Stemming[]
  verzoeken: Verzoek[]
}

function hoeLangGeleden(iso: string) {
  const d = new Date(iso)
  const minuten = Math.round((Date.now() - d.getTime()) / 60000)
  if (minuten < 2) return 'Net gevraagd'
  if (minuten < 60) return `${minuten} minuten geleden gevraagd`
  const uren = Math.round(minuten / 60)
  const vandaag = new Date().toDateString() === d.toDateString()
  if (vandaag) return uren === 1 ? 'Een uur geleden gevraagd' : `${uren} uur geleden gevraagd`
  const gisteren = new Date(Date.now() - 86400000).toDateString() === d.toDateString()
  if (gisteren) return 'Gisteren gevraagd'
  return `${d.toLocaleDateString('nl-NL', { weekday: 'long' })} gevraagd`
}

export function FamilieSignalen({ mijnNaam, mijnId, stemmingen, verzoeken: start }: Props) {
  const [verzoeken, setVerzoeken] = useState(start)
  const [kiesVoor, setKiesVoor] = useState<string | null>(null)
  const [tijd, setTijd] = useState('')

  async function ikKom(id: string, wanneer: string) {
    speelGeluid('succes')
    setKiesVoor(null)
    setTijd('')
    setVerzoeken(prev => prev.map(v => (v.id === id ? { ...v, reactie_naam: mijnNaam, reactie_wanneer: wanneer } : v)))
    const supabase = createClient()
    await supabase
      .from('bezoekverzoeken')
      .update({
        reactie_door: mijnId,
        reactie_naam: mijnNaam,
        reactie_wanneer: wanneer,
        reactie_op: new Date().toISOString(),
      })
      .eq('id', id)
      .is('reactie_door', null)
  }

  if (stemmingen.length === 0 && verzoeken.length === 0) return null

  return (
    <div className="space-y-3">
      {verzoeken.map(v => (
        <div key={v.id} className="rounded-caroo border-2 border-caroo-oranje bg-caroo-oranje-licht p-4">
          <p className="font-bold text-caroo-donker">
            🏠 {v.aangevraagd_naam || 'De hoofdpersoon'} wil graag bezoek
          </p>
          <p className="text-sm text-gray-600 mb-3">{hoeLangGeleden(v.aangemaakt_op)}</p>
          {v.reactie_naam ? (
            <p className="text-sm font-medium text-caroo-groen">
              ✓ {v.reactie_naam} gaat langs{v.reactie_wanneer ? `, ${v.reactie_wanneer}` : ''}
            </p>
          ) : kiesVoor === v.id ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-caroo-donker">Wanneer kom je ongeveer?</p>
              <div className="grid grid-cols-2 gap-2">
                {SNELKEUZES.map(k => (
                  <button
                    key={k}
                    onClick={() => ikKom(v.id, k)}
                    className="rounded-caroo border border-caroo-groen bg-white py-2 text-sm font-medium text-caroo-donker capitalize"
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={tijd}
                  onChange={e => setTijd(e.target.value)}
                  className="input-field flex-1 text-sm"
                  aria-label="Tijd vandaag"
                />
                <button
                  onClick={() => ikKom(v.id, `vandaag rond ${tijd}`)}
                  disabled={!tijd}
                  className="btn-primary px-4 text-sm"
                >
                  Vandaag rond {tijd || '...'}
                </button>
              </div>
              <button onClick={() => setKiesVoor(null)} className="text-xs text-gray-500 underline">
                Annuleren
              </button>
            </div>
          ) : (
            <button onClick={() => setKiesVoor(v.id)} className="btn-primary w-full">
              Ik kom langs
            </button>
          )}
        </div>
      ))}

      {stemmingen.map((s, i) => {
        const info = stemmingInfo(s.stemming)
        if (!info) return null
        return (
          <div key={i} className="caroo-card flex items-center gap-3">
            <span className="text-4xl leading-none">{info.emoji}</span>
            <div>
              <p className="text-sm text-gray-500">{s.naam || 'De hoofdpersoon'} voelt zich vandaag</p>
              <p className="font-bold text-caroo-donker">{info.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
