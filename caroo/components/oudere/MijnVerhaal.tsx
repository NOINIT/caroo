'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'
import Link from 'next/link'

interface Props {
  groepId: string
}

interface DagboekEntry {
  id: string
  inhoud: string
  gesproken: boolean
  aangemaakt_op: string
}

export function MijnVerhaal({ groepId }: Props) {
  const [tekst, setTekst] = useState('')
  const [luistert, setLuistert] = useState(false)
  const [geslagenOp, setGeslagenOp] = useState(false)
  const [entries, setEntries] = useState<DagboekEntry[]>([])
  const [spraakBeschikbaar, setSpraaakBeschikbaar] = useState(false)
  const recognitionRef = useRef<any>(null)
  const { t, info, datum } = useT()

  useEffect(() => {
    // Controleer of Web Speech API beschikbaar is
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSpraaakBeschikbaar(!!SpeechRecognition)

    // Haal eerdere entries op
    laadEntries()
  }, [])

  async function laadEntries() {
    const supabase = createClient()
    const { data } = await supabase
      .from('dagboek')
      .select('id, inhoud, gesproken, aangemaakt_op')
      .eq('groep_id', groepId)
      .order('aangemaakt_op', { ascending: false })
      .limit(10)

    if (data) setEntries(data)
  }

  function startSpraaak() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert(t('verhaal.geenSpraakMelding'))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = info.spraak
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let interim = ''
      let definitief = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          definitief += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (definitief) {
        setTekst(prev => prev + (prev ? ' ' : '') + definitief)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Spraakherkenning fout:', event.error)
      setLuistert(false)
    }

    recognition.onend = () => {
      setLuistert(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setLuistert(true)
  }

  function stopSpraaak() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setLuistert(false)
  }

  async function slaOp(gesproken: boolean = false) {
    if (!tekst.trim()) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('dagboek').insert({
      groep_id: groepId,
      auteur_id: user.id,
      inhoud: tekst.trim(),
      gesproken,
    })

    if (!error) {
      setTekst('')
      setGeslagenOp(true)
      setTimeout(() => setGeslagenOp(false), 3000)
      laadEntries()
    }
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-2">{t('verhaal.titel')}</h2>
      <p className="text-ou-sm text-gray-600 mb-5">
        {t('verhaal.uitleg')}
      </p>

      {geslagenOp && (
        <div className="bg-caroo-groen-licht border border-caroo-groen rounded-caroo p-3 mb-4">
          <p className="text-caroo-groen text-ou-sm font-medium">{t('verhaal.opgeslagen')}</p>
        </div>
      )}

      {/* Tekstinvoer */}
      <textarea
        value={tekst}
        onChange={e => setTekst(e.target.value)}
        placeholder={t('verhaal.placeholder')}
        className="input-field text-ou-base h-40 resize-none mb-4"
        disabled={luistert}
      />

      {/* Spraakknop */}
      {spraakBeschikbaar && (
        <div className="mb-4">
          {!luistert ? (
            <button
              onClick={startSpraaak}
              className="w-full py-5 bg-caroo-oranje-donker text-white text-ou-lg font-bold rounded-caroo-lg
                         flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              <span className="text-2xl">🎤</span>
              {t('verhaal.spreek')}
            </button>
          ) : (
            <button
              onClick={stopSpraaak}
              className="w-full py-5 bg-red-500 text-white text-ou-lg font-bold rounded-caroo-lg
                         flex items-center justify-center gap-3 animate-pulse"
            >
              <span className="text-2xl">⏹️</span>
              {t('verhaal.stop')}
            </button>
          )}
        </div>
      )}

      {!spraakBeschikbaar && (
        <div className="bg-gray-50 rounded-caroo p-3 mb-4 text-center">
          <p className="text-ou-sm text-gray-600">
            {t('verhaal.geenSpraak')}
            <br />
            {t('verhaal.probeerChrome')}
          </p>
        </div>
      )}

      {/* Opslaan knoppen */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => slaOp(false)}
          disabled={!tekst.trim()}
          className="btn-primary flex-1 text-ou-base py-4"
        >
          {t('verhaal.opslaan')}
        </button>
      </div>

      <Link
        href={`/groep/${groepId}/boekje`}
        className="block w-full text-center py-4 mb-6 rounded-caroo border-2 border-caroo-groen text-caroo-groen text-ou-base font-bold"
      >
        {t('verhaal.boekje')}
      </Link>

      {/* Eerdere verhalen */}
      {entries.length > 0 && (
        <div>
          <h3 className="text-ou-base font-semibold text-caroo-donker mb-3">
            {t('verhaal.eerder')}
          </h3>
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="caroo-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{entry.gesproken ? '🎤' : '✍️'}</span>
                  <span className="text-ou-sm text-gray-700">
                    {datum(entry.aangemaakt_op, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-ou-sm text-gray-700 leading-relaxed">{entry.inhoud}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
