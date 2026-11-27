'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { isNativeApp } from '@/lib/app'

type Toestel = 'ios' | 'android' | null
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/**
 * Tip om Clanoo op het beginscherm te zetten, alleen met de stappen voor het toestel dat iemand gebruikt.
 * Niet in de app zelf en niet als Clanoo al vanaf het beginscherm draait.
 * Op Android met Chrome een echte knop, als de browser dat toestaat.
 */
export function BeginschermTip({ onSluit }: { onSluit: () => void }) {
  const { t } = useT()
  const [toestel, setToestel] = useState<Toestel>(null)
  const [installeer, setInstalleer] = useState<InstallEvent | null>(null)
  const [klaar, setKlaar] = useState(false)

  useEffect(() => {
    if (isNativeApp()) return
    if (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone) return
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    if (ios) setToestel('ios')
    else if (/Android/.test(ua)) setToestel('android')
    const opvangen = (e: Event) => { e.preventDefault(); setInstalleer(e as InstallEvent) }
    const geinstalleerd = () => setKlaar(true)
    window.addEventListener('beforeinstallprompt', opvangen)
    window.addEventListener('appinstalled', geinstalleerd)
    return () => {
      window.removeEventListener('beforeinstallprompt', opvangen)
      window.removeEventListener('appinstalled', geinstalleerd)
    }
  }, [])

  if (!toestel || klaar) return null

  async function zetOpBeginscherm() {
    if (!installeer) return
    await installeer.prompt()
    const { outcome } = await installeer.userChoice
    if (outcome === 'accepted') setKlaar(true)
    setInstalleer(null)
  }

  return (
    <div className="bg-caroo-oranje-licht border-b border-caroo-oranje px-4 py-3 md:px-8 space-y-2">
      <div className="flex items-start gap-3">
        <p className="flex-1 text-ou-sm font-bold text-caroo-donker">📲 {t('koppelen.tipTitel')}</p>
        <button onClick={onSluit} className="text-ou-sm font-bold text-caroo-donker underline">{t('koppelen.sluiten')}</button>
      </div>
      {toestel === 'android' && installeer ? (
        <button onClick={zetOpBeginscherm} className="btn-primary w-full text-ou-base py-3">{t('koppelen.tipKnop')}</button>
      ) : (
        <p className="text-ou-sm text-caroo-donker">{toestel === 'ios' ? t('koppelen.tipIos') : t('koppelen.tipAndroid')}</p>
      )}
    </div>
  )
}
