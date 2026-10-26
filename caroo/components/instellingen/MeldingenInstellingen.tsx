'use client'

import { useEffect, useState } from 'react'
import { slaPushAbonnementOp, verwijderPushAbonnement, zetEmailMeldingen, stuurTestMelding } from '@/lib/acties/push'

function naarUint8(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

type PushStaat = 'laden' | 'aan' | 'uit' | 'geblokkeerd' | 'iphone-beginscherm' | 'niet-mogelijk'

export function MeldingenInstellingen({ email: startEmail, groot = false }: { email: boolean; groot?: boolean }) {
  const [push, setPush] = useState<PushStaat>('laden')
  const [email, setEmail] = useState(startEmail)
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState('')

  useEffect(() => {
    ;(async () => {
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
      const losseApp = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
      const kan = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      if (!kan) {
        setPush(isIOS && !losseApp ? 'iphone-beginscherm' : 'niet-mogelijk')
        return
      }
      if (Notification.permission === 'denied') return setPush('geblokkeerd')
      const reg = await navigator.serviceWorker.getRegistration()
      const ab = await reg?.pushManager.getSubscription()
      setPush(ab ? 'aan' : 'uit')
    })()
  }, [])

  async function zetPushAan() {
    setBezig(true)
    setMelding('')
    try {
      const sleutel = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!sleutel) throw new Error('nog niet ingesteld')
      const toestemming = await Notification.requestPermission()
      if (toestemming !== 'granted') {
        setPush(toestemming === 'denied' ? 'geblokkeerd' : 'uit')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const ab =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: naarUint8(sleutel) }))
      const json = ab.toJSON() as any
      const r = await slaPushAbonnementOp({ endpoint: json.endpoint, keys: json.keys })
      if ('error' in r && r.error) throw new Error(r.error)
      setPush('aan')
      await stuurTestMelding()
      setMelding('Gelukt. Je krijgt zo een testmelding.')
    } catch {
      setMelding('Aanzetten lukte niet. Probeer het later nog eens.')
    } finally {
      setBezig(false)
    }
  }

  async function zetPushUit() {
    setBezig(true)
    const reg = await navigator.serviceWorker.getRegistration()
    const ab = await reg?.pushManager.getSubscription()
    if (ab) {
      await verwijderPushAbonnement(ab.endpoint)
      await ab.unsubscribe()
    }
    setPush('uit')
    setMelding('')
    setBezig(false)
  }

  async function kiesEmail(aan: boolean) {
    setEmail(aan)
    await zetEmailMeldingen(aan)
  }

  const tekst = groot ? 'text-ou-base' : 'text-sm'
  const keuze = (actief: boolean) =>
    `rounded-caroo border-2 ${groot ? 'py-4 text-ou-base' : 'py-2.5 text-sm'} font-medium transition-colors ${
      actief ? 'border-caroo-groen bg-caroo-groen-licht text-caroo-donker' : 'border-gray-200 bg-white text-gray-600'
    }`

  return (
    <div className="space-y-4">
      <div>
        <p className={`${tekst} font-medium text-caroo-donker mb-2`}>📱 Pop-up op deze telefoon</p>
        {push === 'iphone-beginscherm' ? (
          <div className={`rounded-caroo bg-caroo-oranje-licht p-3 ${tekst} text-gray-700`}>
            Op een iPhone werkt dit als Clanoo op je beginscherm staat. Tik in Safari onderin op het deelknopje
            <span className="whitespace-nowrap"> (vierkantje met pijl)</span> en kies <strong>Zet op beginscherm</strong>.
            Open Clanoo daarna via het nieuwe icoontje en zet hier de meldingen aan.
          </div>
        ) : push === 'niet-mogelijk' ? (
          <p className={`${tekst} text-gray-500`}>Deze browser ondersteunt geen pop-ups. Kies dan voor e-mail.</p>
        ) : push === 'geblokkeerd' ? (
          <p className={`${tekst} text-gray-600`}>
            Meldingen zijn geblokkeerd voor Clanoo. Zet ze aan in de instellingen van je telefoon of browser en kom dan terug.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={bezig || push === 'laden'} onClick={zetPushAan} className={keuze(push === 'aan')}>
              🔔 Aan
            </button>
            <button type="button" disabled={bezig || push === 'laden'} onClick={zetPushUit} className={keuze(push === 'uit')}>
              🔕 Uit
            </button>
          </div>
        )}
        {melding && <p className="text-xs text-caroo-groen mt-1">{melding}</p>}
      </div>

      <div>
        <p className={`${tekst} font-medium text-caroo-donker mb-2`}>✉️ E-mail</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => kiesEmail(true)} className={keuze(email)}>Aan</button>
          <button type="button" onClick={() => kiesEmail(false)} className={keuze(!email)}>Uit</button>
        </div>
      </div>
    </div>
  )
}
