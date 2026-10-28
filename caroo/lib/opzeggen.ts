/** Hoe lang een groep na het opzeggen nog open blijft om de verhalen te downloaden */
export const NAZORG_DAGEN = 30

export type Toegang = 'actief' | 'nazorg' | 'geen'

/** Mag deze groep nog bij de verhalen, en tot wanneer? */
export function toegangVan(groep: { betaald?: boolean | null; gestopt_op?: string | null }): { toegang: Toegang; tot: Date | null } {
  if (groep.betaald) return { toegang: 'actief', tot: null }
  if (groep.gestopt_op) {
    const tot = new Date(new Date(groep.gestopt_op).getTime() + NAZORG_DAGEN * 86400000)
    if (tot > new Date()) return { toegang: 'nazorg', tot }
  }
  return { toegang: 'geen', tot: null }
}
