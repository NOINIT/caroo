// Eén plek voor de prijzen van Clanoo (bedragen in euro, inclusief btw).
// Verandert er een prijs? Pas hem hier aan; de app en de betaalpagina volgen vanzelf.
export const PRIJS = {
  /** Gratis proefperiode na het aanmaken van een zorggroep, zonder betaalgegevens */
  proefDagen: 30,
  /** Normale maandprijs */
  maand: 15,
  /** Startkorting: zoveel per maand ... */
  maandStart: 10,
  /** ... gedurende zoveel betaalde maanden */
  startMaanden: 6,
  /** Jaarabonnement */
  jaar: 149,
  /** Oprichtersprijs: het eerste jaar, daarna de gewone jaarprijs */
  oprichter: 69,
  /** Zoveel families krijgen de oprichtersprijs */
  oprichterPlekken: 100,
} as const

export type Plan = 'maand' | 'jaar' | 'oprichter'
export const PLANNEN: Plan[] = ['oprichter', 'jaar', 'maand']
export function isPlan(x: unknown): x is Plan {
  return x === 'maand' || x === 'jaar' || x === 'oprichter'
}

/** €15, €149, €12,42 */
export function euro(bedrag: number) {
  return '€' + (Number.isInteger(bedrag) ? String(bedrag) : bedrag.toFixed(2).replace('.', ','))
}

/** Jaarprijs omgerekend per maand, afgerond op centen (€12,42) */
export const JAAR_PER_MAAND = Math.round((PRIJS.jaar / 12) * 100) / 100
