// Herkent de Android- en iPhone-app. De app voegt 'ClanooApp' toe aan zijn user agent
// (zie capacitor.config.ts), zodat ook de server weet dat iemand in de app zit.
export const APP_KENMERK = 'ClanooApp'

export function isAppUA(ua?: string | null) {
  return !!ua && ua.includes(APP_KENMERK)
}

/** Alleen in de browser te gebruiken: draait deze pagina in de app? */
export function isNativeApp() {
  if (typeof window === 'undefined') return false
  const c = (window as any).Capacitor
  if (c?.isNativePlatform?.()) return true
  return isAppUA(navigator.userAgent)
}
