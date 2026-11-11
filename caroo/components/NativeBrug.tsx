'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/lib/app'
import { slaAppTokenOp } from '@/lib/acties/push'

/**
 * Alleen actief in de Android- en iPhone-app:
 * links naar clanoo.nl openen binnen de app, een tik op een melding brengt je naar de juiste plek,
 * en het toestel blijft bekend voor meldingen (Firebase vernieuwt het token af en toe).
 */
export function NativeBrug() {
  useEffect(() => {
    const c = (window as any).Capacitor
    if (!isNativeApp() || !c?.isNativePlatform?.()) return
    const handvatten: { remove: () => void }[] = []
    let gestopt = false

    const naar = (url?: string) => {
      if (!url) return
      try {
        const u = new URL(url, window.location.origin)
        if (u.hostname !== 'clanoo.nl' && u.hostname !== window.location.hostname) return
        const pad = u.pathname + u.search + u.hash
        if (pad !== window.location.pathname + window.location.search + window.location.hash) window.location.href = pad
      } catch {}
    }

    ;(async () => {
      const [{ App }, { PushNotifications }, { StatusBar, Style }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/push-notifications'),
        import('@capacitor/status-bar'),
      ])
      if (gestopt) return
      StatusBar.setStyle({ style: Style.Light }).catch(() => {})
      StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {})
      PushNotifications.createChannel({
        id: 'clanoo', name: 'Clanoo', description: 'Berichten van je familie', importance: 4, visibility: 1, vibration: true,
      }).catch(() => {})

      handvatten.push(await App.addListener('appUrlOpen', ({ url }) => naar(url)))
      handvatten.push(await PushNotifications.addListener('pushNotificationActionPerformed', a => naar(a.notification?.data?.url)))
      // Nieuw token van Firebase: opslaan, zonder de keuze voor pop-ups te veranderen
      handvatten.push(await PushNotifications.addListener('registration', t => { slaAppTokenOp(t.value).catch(() => {}) }))
      const p = await PushNotifications.checkPermissions().catch(() => null)
      if (p?.receive === 'granted') PushNotifications.register().catch(() => {})
    })().catch(() => {})

    return () => { gestopt = true; handvatten.forEach(h => h.remove()) }
  }, [])

  return null
}
