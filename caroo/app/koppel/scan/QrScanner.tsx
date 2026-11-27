'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'
import { useT } from '@/lib/i18n/client'

/**
 * QR-code scannen met de camera, in de app zelf.
 * Zo komt de hoofdpersoon altijd in de app terecht, ook als de telefoon links anders in de browser opent.
 */
export function QrScanner() {
  const { t } = useT()
  const router = useRouter()
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [fout, setFout] = useState<'camera' | 'code' | null>(null)
  const [gevonden, setGevonden] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let stop = false
    let frame = 0

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!video.current) return
        video.current.srcObject = stream
        await video.current.play()
        kijk()
      } catch {
        setFout('camera')
      }
    }

    function kijk() {
      if (stop) return
      const v = video.current, c = canvas.current
      if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
        c.width = v.videoWidth; c.height = v.videoHeight
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(v, 0, 0, c.width, c.height)
          const beeld = ctx.getImageData(0, 0, c.width, c.height)
          const code = jsQR(beeld.data, beeld.width, beeld.height, { inversionAttempts: 'dontInvert' })
          if (code?.data) {
            const pad = koppelPad(code.data)
            if (pad) { setGevonden(true); stop = true; router.replace(pad); return }
            setFout('code')
          }
        }
      }
      frame = requestAnimationFrame(kijk)
    }

    start()
    return () => {
      stop = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach(tr => tr.stop())
    }
  }, [router])

  return (
    <div className="caroo-card text-center space-y-4">
      <h1 className="text-ou-xl font-bold text-caroo-donker">{t('scan.titel')}</h1>
      <p className="text-ou-base text-gray-700">{t('scan.uitleg')}</p>
      {fout === 'camera' ? (
        <p className="text-ou-base text-red-700 bg-red-50 rounded-caroo p-3">{t('scan.geenCamera')}</p>
      ) : (
        <div className="relative rounded-caroo overflow-hidden bg-black aspect-square">
          <video ref={video} playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-8 border-4 border-white/80 rounded-caroo pointer-events-none" />
        </div>
      )}
      <canvas ref={canvas} className="hidden" />
      {gevonden && <p className="text-ou-base text-caroo-groen font-bold" role="status">✓ {t('scan.gevonden')}</p>}
      {fout === 'code' && !gevonden && <p className="text-ou-sm text-gray-600" role="status">{t('scan.verkeerdeCode')}</p>}
    </div>
  )
}

/** Alleen koppelcodes van Clanoo openen, niets anders */
function koppelPad(tekst: string) {
  try {
    const url = new URL(tekst)
    if (!/(^|\.)clanoo\.nl$/.test(url.hostname)) return null
    return /^\/koppel\/[A-Za-z0-9_-]{20,64}$/.test(url.pathname) ? url.pathname : null
  } catch {
    return null
  }
}
