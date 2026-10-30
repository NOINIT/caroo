'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { maakCode, voegToeEnMaakCode } from './actions'

interface Hoofdpersoon { id: string; naam: string; geenEmail: boolean }
interface Code { url: string; qr: string; verloopt: string }

export function KoppelClient({ groepId, hoofdpersonen: start, terug }: { groepId: string; hoofdpersonen: Hoofdpersoon[]; terug?: { url: string; naam: string } | null }) {
  const { t, tijd } = useT()
  const [hoofdpersonen, setHoofdpersonen] = useState(start)
  const [voor, setVoor] = useState<Hoofdpersoon | null>(null)
  const [code, setCode] = useState<Code | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [gekopieerd, setGekopieerd] = useState(false)
  const [nu, setNu] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNu(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])
  const verlopen = code ? new Date(code.verloopt).getTime() < nu : false

  async function maak(h: Hoofdpersoon) {
    setBezig(true); setFout(null); setGekopieerd(false)
    const r = await maakCode(groepId, h.id)
    setBezig(false)
    if ('error' in r) { setFout(r.error ?? null); return }
    setVoor(h); setCode(r)
  }

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true); setFout(null); setGekopieerd(false)
    const r = await voegToeEnMaakCode(groepId, naam, email)
    setBezig(false)
    if ('error' in r) { setFout(r.error ?? null); return }
    const nieuw = { id: r.hoofdpersoon.id, naam: r.hoofdpersoon.naam, geenEmail: !email.trim() }
    setHoofdpersonen(prev => [...prev, nieuw])
    setVoor(nieuw); setCode({ url: r.url, qr: r.qr, verloopt: r.verloopt })
    setNaam(''); setEmail('')
  }

  async function kopieer() {
    if (!code) return
    try { await navigator.clipboard.writeText(code.url); setGekopieerd(true) } catch { /* niet ondersteund */ }
  }

  if (code && voor) {
    return (
      <div className="space-y-5">
        <div className="caroo-card text-center">
          {verlopen ? (
            <p className="py-10 text-gray-700">{t('koppelen.verlopen')}</p>
          ) : (
            <div className="mx-auto w-64 max-w-full [&_svg]:w-full [&_svg]:h-auto" role="img" aria-label={t('koppelen.qrLabel', { naam: voor.naam })} dangerouslySetInnerHTML={{ __html: code.qr }} />
          )}
          {!verlopen && <p className="text-sm text-gray-600 mt-3">{t('koppelen.geldig', { tijd: tijd(code.verloopt) })}</p>}
        </div>
        <ol className="space-y-2 text-caroo-donker">
          <li>1. {t('koppelen.stap1', { naam: voor.naam })}</li>
          <li>2. {t('koppelen.stap2')}</li>
          <li>3. {t('koppelen.stap3', { naam: voor.naam })}</li>
        </ol>
        <div className="rounded-caroo bg-gray-50 p-3 text-sm text-gray-700">
          <p className="mb-2">{t('koppelen.linkUitleg')}</p>
          <button onClick={kopieer} className="btn-secondary text-sm py-2">{gekopieerd ? t('koppelen.gekopieerd') : t('koppelen.kopieer')}</button>
        </div>
        {terug && (
          <a href={terug.url} className="btn-primary w-full block text-center">👭 {t('vrienden.familie.verderUitnodiging', { naam: terug.naam })}</a>
        )}
        <div className="flex gap-3">
          <button onClick={() => maak(voor)} disabled={bezig} className="btn-secondary flex-1">{t('koppelen.nieuweCode')}</button>
          <button onClick={() => { setCode(null); setVoor(null) }} className="text-sm text-gray-600 underline px-2">{t('algemeen.annuleren')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {fout && <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-sm">{fout}</div>}

      {terug && hoofdpersonen.length > 0 && (
        <a href={terug.url} className="btn-primary w-full block text-center text-lg py-4">👭 {t('vrienden.familie.verderUitnodiging', { naam: terug.naam })}</a>
      )}

      {hoofdpersonen.length > 0 && (
        <div className="space-y-3">
          {hoofdpersonen.map(h => (
            <button key={h.id} onClick={() => maak(h)} disabled={bezig} className="btn-primary w-full text-lg py-4">
              📱 {t('koppelen.knop', { naam: h.naam })}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={voegToe} className="caroo-card space-y-4">
        <h2 className="font-bold text-caroo-donker">{t('koppelen.nieuwTitel')}</h2>
        <div>
          <label className="input-label" htmlFor="hp-naam">{t('koppelen.naam')}</label>
          <input id="hp-naam" className="input-field" value={naam} onChange={e => setNaam(e.target.value)} required maxLength={60} />
        </div>
        <div>
          <label className="input-label" htmlFor="hp-email">{t('koppelen.email')}</label>
          <input id="hp-email" type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
          <p className="text-xs text-gray-600 mt-1">{t('koppelen.geenEmailUitleg')}</p>
        </div>
        <button type="submit" disabled={bezig || !naam.trim()} className="btn-primary w-full">
          {bezig ? t('koppelen.bezig') : t('koppelen.toevoegen')}
        </button>
      </form>
    </div>
  )
}
