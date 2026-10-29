import { PRIJS } from '@/lib/prijzen'

/** Hoe lang een groep na het opzeggen nog open blijft om de verhalen te downloaden */
export const NAZORG_DAGEN = 30

/**
 * actief  = er loopt een abonnement
 * proef   = de gratis maand na het aanmaken loopt nog
 * nazorg  = opgezegd, de verhalen kunnen nog gedownload worden
 * geen    = geen toegang (proefmaand voorbij of nazorg verlopen)
 */
export type Toegang = 'actief' | 'proef' | 'nazorg' | 'geen'

type Groep = { betaald?: boolean | null; gestopt_op?: string | null; aangemaakt_op?: string | null }

/** Wat mag deze groep, en tot wanneer? */
export function toegangVan(groep: Groep): { toegang: Toegang; tot: Date | null } {
  if (groep.betaald) return { toegang: 'actief', tot: null }
  if (groep.gestopt_op) {
    const tot = new Date(new Date(groep.gestopt_op).getTime() + NAZORG_DAGEN * 86400000)
    if (tot > new Date()) return { toegang: 'nazorg', tot }
    return { toegang: 'geen', tot: null }
  }
  if (groep.aangemaakt_op) {
    const tot = proefEinde(groep.aangemaakt_op)
    if (tot > new Date()) return { toegang: 'proef', tot }
  }
  return { toegang: 'geen', tot: null }
}

/** Mag de familie de app gebruiken (abonnement of gratis maand)? */
export function magGebruiken(groep: Groep) {
  const { toegang } = toegangVan(groep)
  return toegang === 'actief' || toegang === 'proef'
}

export function proefEinde(aangemaaktOp: string) {
  return new Date(new Date(aangemaaktOp).getTime() + PRIJS.proefDagen * 86400000)
}

/** Hele dagen die er nog over zijn, minimaal 1 zolang de proef loopt */
export function dagenTot(tot: Date) {
  return Math.max(1, Math.ceil((tot.getTime() - Date.now()) / 86400000))
}
