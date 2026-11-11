'use client'
// Meldingen in de Android- en iPhone-app (Firebase). Alleen gebruiken als isNativeApp() waar is.
import { slaAppTokenOp } from '@/lib/acties/push'

export async function appToestemming(): Promise<'granted' | 'denied' | 'prompt'> {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const p = await PushNotifications.checkPermissions()
  return p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'prompt'
}

/** Vraagt toestemming, meldt het toestel aan bij Firebase en slaat het token op. */
export async function zetAppMeldingenAan(): Promise<'aan' | 'geblokkeerd' | 'mislukt'> {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  let p = await PushNotifications.checkPermissions()
  if (p.receive !== 'granted') p = await PushNotifications.requestPermissions()
  if (p.receive !== 'granted') return 'geblokkeerd'
  const apparaat = await new Promise<string>((goed, fout) => {
    const handvatten: { remove: () => void }[] = []
    const klaar = () => handvatten.forEach(h => h.remove())
    const wachten = setTimeout(() => { klaar(); fout(new Error('tijd')) }, 20000)
    PushNotifications.addListener('registration', t => { clearTimeout(wachten); klaar(); goed(t.value) }).then(h => handvatten.push(h))
    PushNotifications.addListener('registrationError', e => { clearTimeout(wachten); klaar(); fout(e) }).then(h => handvatten.push(h))
    PushNotifications.register()
  }).catch(() => null)
  if (!apparaat) return 'mislukt'
  const r = await slaAppTokenOp(apparaat, true)
  return 'error' in r && r.error ? 'mislukt' : 'aan'
}
