'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STEMMINGEN, stemmingInfo, vandaagNL, BEZOEK_GELDIG_UUR } from '@/lib/stemming'
import { speelGeluid } from '@/lib/geluid'

export interface Bezoekverzoek {
  id: string
  aangemaakt_op: string
  reactie_naam: string | null
  reactie_op: string | null
}

interface Props {
  groepId: string
  userId: string
  naam: string
  dagAfspraken: any[]
  medicijnen: any[]
  stemmingVandaag: number | null
  bezoek: Bezoekverzoek | null
  aantalBoodschappen: number
  nieuwsteFoto: { url: string; beschrijving: string | null; door: string | null } | null
  gaNaar: (tab: 'boodschappen' | 'fotos' | 'mijn_dag') => void
}

export function Thuis({
  groepId, userId, naam, dagAfspraken, medicijnen,
  stemmingVandaag, bezoek: startBezoek, aantalBoodschappen, nieuwsteFoto, gaNaar,
}: Props) {
  const [stemming, setStemming] = useState<number | null>(stemmingVandaag)
  const [kiest, setKiest] = useState(stemmingVandaag === null)
  const [bezoek, setBezoek] = useState<Bezoekverzoek | null>(startBezoek)
  const [bezig, setBezig] = useState(false)

  const vandaagTekst = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  // Kijken of iemand al heeft gereageerd op het bezoekverzoek
  const ververs = useCallback(async () => {
    const supabase = createClient()
    const sinds = new Date(Date.now() - BEZOEK_GELDIG_UUR * 3600 * 1000).toISOString()
    const { data } = await supabase
      .from('bezoekverzoeken')
      .select('id, aangemaakt_op, reactie_naam, reactie_op')
      .eq('groep_id', groepId)
      .eq('aangevraagd_door', userId)
      .gt('aangemaakt_op', sinds)
      .order('aangemaakt_op', { ascending: false })
      .limit(1)
      .maybeSingle()
    setBezoek(data ?? null)
  }, [groepId, userId])

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') ververs()
    }, 30000)
    return () => clearInterval(t)
  }, [ververs])

  async function kiesStemming(waarde: number) {
    setStemming(waarde)
    setKiest(false)
    speelGeluid('succes')
    const supabase = createClient()
    await supabase.from('stemmingen').upsert(
      {
        groep_id: groepId,
        user_id: userId,
        naam,
        datum: vandaagNL(),
        stemming: waarde,
        bijgewerkt_op: new Date().toISOString(),
      },
      { onConflict: 'groep_id,user_id,datum' }
    )
  }

  async function vraagBezoek() {
    if (bezig) return
    setBezig(true)
    speelGeluid('succes')
    const supabase = createClient()
    const { data } = await supabase
      .from('bezoekverzoeken')
      .insert({ groep_id: groepId, aangevraagd_door: userId, aangevraagd_naam: naam })
      .select('id, aangemaakt_op, reactie_naam, reactie_op')
      .single()
    if (data) setBezoek(data)
    setBezig(false)
  }

  async function trekIn() {
    if (!bezoek) return
    speelGeluid('tik')
    const supabase = createClient()
    await supabase.from('bezoekverzoeken').delete().eq('id', bezoek.id)
    setBezoek(null)
  }

  const gekozen = stemmingInfo(stemming)

  return (
    <div className="px-4 py-5 space-y-5">
      <p className="text-ou-base text-gray-500 capitalize">{vandaagTekst}</p>

      {/* Stemming van vandaag */}
      <section className="rounded-caroo-lg bg-caroo-groen-licht border-2 border-caroo-groen p-5">
        {kiest || !gekozen ? (
          <>
            <h2 className="text-ou-xl font-bold text-caroo-donker mb-4 text-center">
              Hoe voel je je vandaag?
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {STEMMINGEN.map(s => (
                <button
                  key={s.waarde}
                  onClick={() => kiesStemming(s.waarde)}
                  className={`flex flex-col items-center rounded-caroo bg-white py-3 border-2 transition-transform active:scale-95 ${
                    stemming === s.waarde ? 'border-caroo-groen' : 'border-transparent'
                  }`}
                  aria-label={s.label}
                >
                  <span className="text-4xl leading-none">{s.emoji}</span>
                  <span className="text-[11px] text-gray-600 mt-1.5 leading-tight text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-6xl leading-none">{gekozen.emoji}</span>
            <div className="flex-1">
              <p className="text-ou-sm text-gray-600">Vandaag voel je je</p>
              <p className="text-ou-xl font-bold text-caroo-donker">{gekozen.label}</p>
              <p className="text-ou-sm text-caroo-groen">Je familie ziet dit ook 💛</p>
            </div>
            <button onClick={() => setKiest(true)} className="text-ou-sm text-gray-500 underline">
              Wijzig
            </button>
          </div>
        )}
      </section>

      {/* Ik wil bezoek */}
      {!bezoek ? (
        <button
          onClick={vraagBezoek}
          disabled={bezig}
          className="w-full rounded-caroo-lg bg-caroo-oranje text-white py-7 shadow-md active:scale-[0.98] transition-transform"
        >
          <span className="block text-5xl mb-1">🏠</span>
          <span className="block text-ou-2xl font-bold">Ik wil bezoek</span>
          <span className="block text-ou-sm text-white/90 mt-1">Je familie krijgt het meteen te zien</span>
        </button>
      ) : bezoek.reactie_naam ? (
        <section className="rounded-caroo-lg bg-caroo-oranje-licht border-2 border-caroo-oranje p-5 text-center">
          <p className="text-5xl mb-2">🎉</p>
          <p className="text-ou-xl font-bold text-caroo-donker">{bezoek.reactie_naam} komt langs!</p>
          <button onClick={trekIn} className="text-ou-sm text-gray-500 underline mt-3">
            Klaar, nieuw verzoek kunnen doen
          </button>
        </section>
      ) : (
        <section className="rounded-caroo-lg bg-caroo-oranje-licht border-2 border-caroo-oranje p-5 text-center">
          <p className="text-5xl mb-2">💌</p>
          <p className="text-ou-xl font-bold text-caroo-donker">Je familie weet het</p>
          <p className="text-ou-base text-gray-600 mt-1">Zodra iemand reageert, zie je het hier.</p>
          <button onClick={trekIn} className="text-ou-sm text-gray-500 underline mt-3">
            Toch niet nodig
          </button>
        </section>
      )}

      {/* Vandaag */}
      <section className="caroo-card">
        <button onClick={() => gaNaar('mijn_dag')} className="w-full text-left">
          <h2 className="text-ou-lg font-bold text-caroo-donker mb-2">📅 Vandaag</h2>
          {dagAfspraken.length === 0 ? (
            <p className="text-ou-base text-gray-500">Geen afspraken. Een rustige dag.</p>
          ) : (
            <ul className="space-y-2">
              {dagAfspraken.map((af: any) => (
                <li key={af.id} className="flex items-baseline gap-3">
                  <span className="text-ou-base font-semibold text-caroo-groen w-14 flex-shrink-0">
                    {new Date(af.start_tijd).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-ou-base text-caroo-donker">{af.titel}</span>
                </li>
              ))}
            </ul>
          )}
        </button>
      </section>

      {/* Boodschappen en foto */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => gaNaar('boodschappen')} className="caroo-card text-left py-5 active:scale-[0.98] transition-transform">
          <span className="block text-4xl mb-2">🛒</span>
          <span className="block text-ou-lg font-bold text-caroo-donker">Boodschappen</span>
          <span className="block text-ou-sm text-gray-500">
            {aantalBoodschappen === 0 ? 'Lijst is leeg' : `${aantalBoodschappen} op de lijst`}
          </span>
        </button>
        <button
          onClick={() => gaNaar('fotos')}
          className="caroo-card text-left p-0 overflow-hidden active:scale-[0.98] transition-transform"
        >
          {nieuwsteFoto?.url ? (
            <div className="relative h-full min-h-[140px]">
              <img src={nieuwsteFoto.url} alt={nieuwsteFoto.beschrijving || 'Nieuwste foto'} className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-ou-sm px-2 py-1">
                Nieuwste foto{nieuwsteFoto.door ? ` van ${nieuwsteFoto.door}` : ''}
              </span>
            </div>
          ) : (
            <div className="p-4 py-5">
              <span className="block text-4xl mb-2">📸</span>
              <span className="block text-ou-lg font-bold text-caroo-donker">Foto&apos;s</span>
              <span className="block text-ou-sm text-gray-500">Nog geen foto&apos;s</span>
            </div>
          )}
        </button>
      </div>

      {/* Medicijnen */}
      {medicijnen.length > 0 && (
        <section className="caroo-card border-l-4 border-caroo-oranje">
          <h2 className="text-ou-lg font-bold text-caroo-donker mb-2">💊 Medicijnen vandaag</h2>
          {medicijnen.map((med: any) => (
            <div key={med.id} className="mb-1.5">
              <p className="text-ou-base text-gray-800">{med.naam}, {med.dosering}</p>
              <p className="text-ou-sm text-gray-500">{(med.tijdstippen || []).join(', ')} uur</p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
