'use client'

import { useState } from 'react'
import { stemmingInfo } from '@/lib/stemming'
import { speelGeluid } from '@/lib/geluid'
import { reageerOpBezoek } from '@/lib/acties/bezoek'
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
}

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
  const [verzoeken, setVerzoeken] = useState(start.filter(v =>
    v.soort !== 'bellen' || Date.now() - new Date(v.aangemaakt_op).getTime() < BEL_GELDIG_UUR * 3600 * 1000))
  const [alGeregeld, setAlGeregeld] = useState<string | null>(null)
  const [kiesVoor, setKiesVoor] = useState<string | null>(null)
  const [tijd, setTijd] = useState('')
  const { t, datum } = useT()

  async function ikKom(id: string, wanneer: string) {
    speelGeluid('succes')
    setKiesVoor(null)
    setTijd('')
    setVerzoeken(prev => prev.map(v => (v.id === id ? { ...v, reactie_naam: mijnNaam, reactie_wanneer: wanneer } : v)))
    const r = await reageerOpBezoek(id, wanneer)
    if ('alGeregeld' in r && r.alGeregeld) {
      // Iemand anders was net eerder: dan is het geregeld, geen foutmelding
      setAlGeregeld(id)
      setVerzoeken(prev => prev.map(v => (v.id === id ? { ...v, reactie_naam: r.naam, reactie_wanneer: r.wanneer } : v)))
    } else if ('error' in r && r.error) {
      setVerzoeken(prev => prev.map(v => (v.id === id ? { ...v, reactie_naam: null, reactie_wanneer: null } : v)))
    }
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
          {v.reactie_naam ? (
            <p className="text-sm font-medium text-caroo-groen">
              {v.soort === 'bellen'
                ? t('signalen.belt', { naam: v.reactie_naam })
                : v.reactie_wanneer
                  ? t('signalen.gaatLangsWanneer', { naam: v.reactie_naam, wanneer: wanneerTekst(t, v.reactie_wanneer) })
                  : t('signalen.gaatLangs', { naam: v.reactie_naam })}
              {alGeregeld === v.id && <span className="block text-gray-600 font-normal mt-1">{t('signalen.wasEerder')}</span>}
            </p>
          ) : v.soort === 'bellen' ? (
            <button onClick={() => ikKom(v.id, '')} className="btn-primary w-full">
              📞 {t('signalen.ikBel')}
            </button>
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
                <input
                  type="time"
                  value={tijd}
                  onChange={e => setTijd(e.target.value)}
                  className="input-field flex-1 text-sm"
                  aria-label={t('signalen.tijdVandaag')}
                />
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
              {t('signalen.ikKomLangs')}
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
