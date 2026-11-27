'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVolg } from '@/lib/useVolg'
import { stemmingInfo } from '@/lib/stemming'
import { speelGeluid } from '@/lib/geluid'
import { reageerOpBezoek, trekReactieIn } from '@/lib/acties/bezoek'
import { TijdKiezer } from '@/components/ui/TijdKiezer'
import { useT } from '@/lib/i18n/client'
import { WANNEER_CODES, wanneerTekst, hoofdletter, stemmingLabel, type TFunctie } from '@/lib/i18n/vertaal'
import { BEL_GELDIG_UUR } from '@/lib/stemming'

interface Stemming { naam: string | null; stemming: number; bijgewerkt_op: string }
interface Verzoek {
  id: string
  aangevraagd_naam: string | null
  aangemaakt_op: string
  reactie_naam: string | null
  reactie_wanneer: string | null
  soort?: string | null
  bezoek_reacties?: Reactie[] | null
}
interface Reactie { user_id: string; naam: string; wanneer: string | null; aangemaakt_op?: string }

interface Props {
  mijnNaam: string
  mijnId: string
  stemmingen: Stemming[]
  verzoeken: Verzoek[]
}

function hoeLangGeleden(t: TFunctie, datum: (d: Date, o: Intl.DateTimeFormatOptions) => string, iso: string) {
  const d = new Date(iso)
  const minuten = Math.round((Date.now() - d.getTime()) / 60000)
  if (minuten < 2) return t('signalen.netGevraagd')
  if (minuten < 60) return t('signalen.minutenGeleden', { aantal: minuten })
  const uren = Math.round(minuten / 60)
  const vandaag = new Date().toDateString() === d.toDateString()
  if (vandaag) return uren === 1 ? t('signalen.uurGeleden') : t('signalen.urenGeleden', { aantal: uren })
  const gisteren = new Date(Date.now() - 86400000).toDateString() === d.toDateString()
  if (gisteren) return t('signalen.gisteren')
  return hoofdletter(t('signalen.dagGevraagd', { dag: datum(d, { weekday: 'long' }) }))
}

export function FamilieSignalen({ mijnNaam, mijnId, stemmingen, verzoeken: start }: Props) {
  // Belverzoeken tellen maar een paar uur; daarna is het moment voorbij
  // Volgt de server: na elke verversing de nieuwste stand
  const [alle, setAlle] = useVolg(start)
  // Belverzoeken tellen maar een paar uur; daarna is het moment voorbij
  const verzoeken = alle.filter(v =>
    v.soort !== 'bellen' || Date.now() - new Date(v.aangemaakt_op).getTime() < BEL_GELDIG_UUR * 3600 * 1000)
  const [alGeregeld, setAlGeregeld] = useState<string | null>(null)
  const [kiesVoor, setKiesVoor] = useState<string | null>(null)
  const [tijd, setTijd] = useState('')
  const { t, datum } = useT()
  const router = useRouter()

  async function ikKom(id: string, wanneer: string) {
    speelGeluid('succes')
    setKiesVoor(null)
    setTijd('')
    // Meteen laten zien, daarna de server laten bevestigen
    setAlle(prev => prev.map(v => {
      if (v.id !== id) return v
      if (v.soort === 'bellen') return { ...v, reactie_naam: mijnNaam, reactie_wanneer: wanneer }
      const andere = (v.bezoek_reacties || []).filter(r => r.user_id !== mijnId)
      return { ...v, reactie_naam: v.reactie_naam || mijnNaam, bezoek_reacties: [...andere, { user_id: mijnId, naam: mijnNaam, wanneer }] }
    }))
    const r = await reageerOpBezoek(id, wanneer)
    if ('alGeregeld' in r && r.alGeregeld) {
      // Bij bellen was iemand anders net eerder: dan is het geregeld, geen foutmelding
      setAlGeregeld(id)
      setAlle(prev => prev.map(v => (v.id === id ? { ...v, reactie_naam: r.naam, reactie_wanneer: r.wanneer } : v)))
    }
    router.refresh()
  }

  async function komTochNiet(id: string) {
    setAlle(prev => prev.map(v => (v.id === id ? { ...v, bezoek_reacties: (v.bezoek_reacties || []).filter(r => r.user_id !== mijnId) } : v)))
    await trekReactieIn(id)
    router.refresh()
  }

  if (stemmingen.length === 0 && verzoeken.length === 0) return null

  return (
    <div className="space-y-3">
      {verzoeken.map(v => (
        <div key={v.id} className="rounded-caroo border-2 border-caroo-oranje bg-caroo-oranje-licht p-4">
          <p className="font-bold text-caroo-donker">
            {v.soort === 'bellen'
              ? t('signalen.wilGebeld', { naam: v.aangevraagd_naam || t('algemeen.deHoofdpersoon') })
              : t('signalen.wilBezoek', { naam: v.aangevraagd_naam || t('algemeen.deHoofdpersoon') })}
          </p>
          <p className="text-sm text-gray-600 mb-3">{hoeLangGeleden(t, datum, v.aangemaakt_op)}</p>
          {v.soort !== 'bellen' && (v.bezoek_reacties || []).length > 0 && (
            <ul className="mb-3 space-y-1">
              {(v.bezoek_reacties || []).map(r => (
                <li key={r.user_id} className="text-sm font-medium text-caroo-groen flex items-start justify-between gap-2">
                  <span>
                    {r.user_id === mijnId
                      ? (r.wanneer ? t('signalen.jijGaatLangsWanneer', { wanneer: wanneerTekst(t, r.wanneer) }) : t('signalen.jijGaatLangs'))
                      : (r.wanneer ? t('signalen.gaatLangsWanneer', { naam: r.naam, wanneer: wanneerTekst(t, r.wanneer) }) : t('signalen.gaatLangs', { naam: r.naam }))}
                  </span>
                  {r.user_id === mijnId && (
                    <button onClick={() => komTochNiet(v.id)} className="text-xs text-gray-600 underline flex-shrink-0">{t('signalen.tochNietKomen')}</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {v.soort === 'bellen' && v.reactie_naam ? (
            <p className="text-sm font-medium text-caroo-groen">
              {t('signalen.belt', { naam: v.reactie_naam })}
              {alGeregeld === v.id && <span className="block text-gray-600 font-normal mt-1">{t('signalen.wasEerder')}</span>}
            </p>
          ) : v.soort !== 'bellen' && (v.bezoek_reacties || []).some(r => r.user_id === mijnId) ? null
          : v.soort === 'bellen' ? (
            <div className="space-y-2">
              <p className="text-sm text-caroo-donker">{t('signalen.ikBelUitleg')}</p>
              <button onClick={() => ikKom(v.id, '')} className="btn-primary w-full">
                📞 {t('signalen.ikBel')}
              </button>
            </div>
          ) : kiesVoor === v.id ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-caroo-donker">{t('signalen.wanneer')}</p>
              <div className="grid grid-cols-2 gap-2">
                {WANNEER_CODES.map(k => (
                  <button
                    key={k}
                    onClick={() => ikKom(v.id, k)}
                    className="rounded-caroo border border-caroo-groen bg-white py-2 text-sm font-medium text-caroo-donker"
                  >
                    {hoofdletter(wanneerTekst(t, k))}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <TijdKiezer value={tijd} onChange={setTijd} label={t('signalen.tijdVandaag')} />
                </div>
                <button
                  onClick={() => ikKom(v.id, `tijd:${tijd}`)}
                  disabled={!tijd}
                  className="btn-primary px-4 text-sm"
                >
                  {t('signalen.vandaagRond', { tijd: tijd || '...' })}
                </button>
              </div>
              <button onClick={() => setKiesVoor(null)} className="text-xs text-gray-600 underline">
                {t('algemeen.annuleren')}
              </button>
            </div>
          ) : (
            <button onClick={() => setKiesVoor(v.id)} className="btn-primary w-full">
              {(v.bezoek_reacties || []).length > 0 ? t('signalen.ikKomOok') : t('signalen.ikKomLangs')}
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
              <p className="text-sm text-gray-600">{t('signalen.voeltZich', { naam: s.naam || t('algemeen.deHoofdpersoon') })}</p>
              <p className="font-bold text-caroo-donker">{stemmingLabel(t, info.waarde)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
