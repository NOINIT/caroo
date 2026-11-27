'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Houdt het scherm bij zonder dat iemand hoeft te verversen.
 * Haalt de pagina opnieuw op elke paar seconden zolang hij zichtbaar is,
 * en meteen als iemand terugkomt in de app of het tabblad.
 */
export function AutoVerversen({ seconden = 10 }: { seconden?: number }) {
  const router = useRouter()
  useEffect(() => {
    let laatste = Date.now()
    const ververs = () => {
      if (document.visibilityState !== 'visible') return
      // Niet verversen terwijl iemand typt: dan springt de cursor of het toetsenbord niet weg
      const actief = document.activeElement
      if (actief && (actief.tagName === 'INPUT' || actief.tagName === 'TEXTAREA' || actief.tagName === 'SELECT')) return
      laatste = Date.now()
      router.refresh()
    }
    const terug = () => { if (Date.now() - laatste > 2000) ververs() }
    const timer = setInterval(ververs, seconden * 1000)
    document.addEventListener('visibilitychange', terug)
    window.addEventListener('focus', terug)
    window.addEventListener('online', terug)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', terug)
      window.removeEventListener('focus', terug)
      window.removeEventListener('online', terug)
    }
  }, [router, seconden])
  return null
}
