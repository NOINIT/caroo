'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STEMMINGEN, stemmingInfo, vandaagNL, BEZOEK_GELDIG_UUR } from '@/lib/stemming'
import { speelGeluid } from '@/lib/geluid'
import { vraagBezoekAan } from '@/lib/acties/bezoek'
import { useT } from '@/lib/i18n/client'
import { wanneerTekst, hoofdletter, stemmingLabel } from '@/lib/i18n/vertaal'

export interface Bezoekverzoek {
  id: string
  aangemaakt_op: string
  reactie_naam: string | null
  reactie_op: string | null
  reactie_wanneer: string | null
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
  const { t, datum, tijd } = useT()

  const vandaagTekst = datum(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })

  // Kijken of iemand al heeft gereageerd op het bezoekverzoek
  const ververs = useCallback(async () => {
    const supabase = createClient()
    const sinds = new Date(Date.now() - BEZOEK_GELDIG_UUR * 3600 * 1000).toISOString()
    const { data } = await supabase
      .from('bezoekverzoeken')
      .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
      .eq('groep_id', groepId)
      .eq('aangevraagd_door', userId)
      .gt('aangemaakt_op', sinds)
      .order('aangemaakt_op', { ascending: false })
      .limit(1)
      .maybeSingle()
    setBezoek(data ?? null)
  }, [groepId, userId])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') ververs()
    }, 30000)
    return () => clearInterval(timer)
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
    const r = await vraagBezoekAan(groepId)
    if ('verzoek' in r && r.verzoek) setBezoek(r.verzoek)
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
    <div className="px-4 py-5 space-y-5 md:px-8 md:py-7 md:space-y-6">
      <p className="text-ou-base md:text-ou-lg text-gray-600">{hoofdletter(vandaagTekst)}</p>

      {/* Op een liggende tablet: stemming en bezoek naast elkaar */}
      <div className="space-y-5 md:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
      {/* Stemming van vandaag */}
      <section className="rounded-caroo-lg bg-caroo-groen-licht border-2 border-caroo-groen p-5 md:p-6 md:flex md:flex-col md:justify-center">
        {kiest || !gekozen ? (
          <>
            <h2 className="text-ou-xl md:text-ou-2xl font-bold text-caroo-donker mb-4 text-center">
              {t('thuis.hoeVoelJe')}
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {STEMMINGEN.map(s => (
                <button
                  key={s.waarde}
                  onClick={() => kiesStemming(s.waarde)}
                  className={`flex flex-col items-center rounded-caroo bg-white py-3 border-2 transition-transform active:scale-95 ${
                    stemming === s.waarde ? 'border-caroo-groen' : 'border-transparent'
                  }`}
                  aria-label={stemmingLabel(t, s.waarde)}
                >
                  <span className="text-4xl md:text-5xl leading-none">{s.emoji}</span>
                  <span className="text-sm md:text-base text-gray-700 mt-1.5 leading-tight text-center">{stemmingLabel(t, s.waarde)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-6xl leading-none">{gekozen.emoji}</span>
            <div className="flex-1">
              <p className="text-ou-sm text-gray-600">{t('thuis.vandaagVoelJe')}</p>
              <p className="text-ou-xl font-bold text-caroo-donker">{stemmingLabel(t, gekozen.waarde)}</p>
              <p className="text-ou-sm text-caroo-groen">{t('thuis.familieZietDit')}</p>
            </div>
            <button onClick={() => setKiest(true)} className="text-ou-sm text-gray-600 underline">
              {t('thuis.wijzig')}
            </button>
          </div>
        )}
      </section>

      {/* Ik wil bezoek */}
      {!bezoek ? (
        <button
          onClick={vraagBezoek}
          disabled={bezig}
          className="w-full lg:h-full lg:min-h-[260px] md:py-9 rounded-caroo-lg bg-caroo-oranje-donker text-white py-7 shadow-md active:scale-[0.98] transition-transform"
        >
          <span className="block text-5xl md:text-7xl mb-1">🏠</span>
          <span className="block text-ou-2xl md:text-4xl font-bold">{t('thuis.ikWilBezoek')}</span>
          <span className="block text-ou-sm md:text-ou-lg text-white mt-1">{t('thuis.familieZietMeteen')}</span>
        </button>
      ) : bezoek.reactie_naam ? (
        <section className="rounded-caroo-lg bg-caroo-oranje-licht border-2 border-caroo-oranje p-5 text-center md:flex md:flex-col md:justify-center">
          <p className="text-5xl mb-2">🎉</p>
          <p className="text-ou-xl font-bold text-caroo-donker">{t('thuis.komtLangs', { naam: bezoek.reactie_naam })}</p>
          {bezoek.reactie_wanneer && (
            <p className="text-ou-lg text-caroo-donker mt-1">
              🕒 <span className="font-semibold">{hoofdletter(wanneerTekst(t, bezoek.reactie_wanneer))}</span>
            </p>
          )}
          <button onClick={trekIn} className="text-ou-sm text-gray-600 underline mt-3">
            {t('thuis.klaarNieuw')}
          </button>
        </section>
      ) : (
        <section className="rounded-caroo-lg bg-caroo-oranje-licht border-2 border-caroo-oranje p-5 text-center md:flex md:flex-col md:justify-center">
          <p className="text-5xl mb-2">💌</p>
          <p className="text-ou-xl font-bold text-caroo-donker">{t('thuis.familieWeetHet')}</p>
          <p className="text-ou-base text-gray-600 mt-1">{t('thuis.zodraIemand')}</p>
          <button onClick={trekIn} className="text-ou-sm text-gray-600 underline mt-3">
            {t('thuis.tochNiet')}
          </button>
        </section>
      )}
      </div>

      {/* Op een tablet: vandaag en boodschappen/foto naast elkaar */}
      <div className="space-y-5 md:space-y-0 md:grid md:grid-cols-2 md:gap-6">
      {/* Vandaag */}
      <section className="caroo-card md:p-6">
        <button onClick={() => gaNaar('mijn_dag')} className="w-full text-start">
          <h2 className="text-ou-lg font-bold text-caroo-donker mb-2">{t('thuis.vandaag')}</h2>
          {dagAfspraken.length === 0 ? (
            <p className="text-ou-base text-gray-600">{t('thuis.rustigeDag')}</p>
          ) : (
            <ul className="space-y-2">
              {dagAfspraken.map((af: any) => (
                <li key={af.id} className="flex items-baseline gap-3">
                  <span className="text-ou-base font-semibold text-caroo-groen w-14 flex-shrink-0">
                    {tijd(af.start_tijd)}
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
        <button onClick={() => gaNaar('boodschappen')} className="caroo-card text-start py-5 active:scale-[0.98] transition-transform">
          <span className="block text-4xl mb-2">🛒</span>
          <span className="block text-ou-lg font-bold text-caroo-donker">{t('thuis.boodschappen')}</span>
          <span className="block text-ou-sm text-gray-600">
            {aantalBoodschappen === 0 ? t('thuis.lijstLeeg') : t('thuis.opDeLijst', { aantal: aantalBoodschappen })}
          </span>
        </button>
        <button
          onClick={() => gaNaar('fotos')}
          className="caroo-card text-start p-0 overflow-hidden active:scale-[0.98] transition-transform"
        >
          {nieuwsteFoto?.url ? (
            <div className="relative h-full min-h-[140px]">
              <img src={nieuwsteFoto.url} alt={nieuwsteFoto.beschrijving || t('thuis.nieuwsteFoto')} className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-ou-sm px-2 py-1">
                {nieuwsteFoto.door ? t('thuis.nieuwsteFotoVan', { naam: nieuwsteFoto.door }) : t('thuis.nieuwsteFoto')}
              </span>
            </div>
          ) : (
            <div className="p-4 py-5">
              <span className="block text-4xl mb-2">📸</span>
              <span className="block text-ou-lg font-bold text-caroo-donker">{t('thuis.fotos')}</span>
              <span className="block text-ou-sm text-gray-600">{t('thuis.geenFotos')}</span>
            </div>
          )}
        </button>
      </div>
      </div>

      {/* Medicijnen */}
      {medicijnen.length > 0 && (
        <section className="caroo-card border-s-4 border-caroo-oranje">
          <h2 className="text-ou-lg font-bold text-caroo-donker mb-2">{t('thuis.medicijnenVandaag')}</h2>
          {medicijnen.map((med: any) => (
            <div key={med.id} className="mb-1.5">
              <p className="text-ou-base text-gray-800">{med.naam}, {med.dosering}</p>
              <p className="text-ou-sm md:text-ou-base text-gray-600">{t('thuis.tijdenUur', { tijden: (med.tijdstippen || []).join(', ') })}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
