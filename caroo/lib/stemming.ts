export const STEMMINGEN = [
  { waarde: 5, emoji: '😄', label: 'Heel goed' },
  { waarde: 4, emoji: '🙂', label: 'Goed' },
  { waarde: 3, emoji: '😐', label: 'Gaat wel' },
  { waarde: 2, emoji: '😔', label: 'Niet zo goed' },
  { waarde: 1, emoji: '😢', label: 'Slecht' },
] as const

export function stemmingInfo(waarde: number | null | undefined) {
  return STEMMINGEN.find(s => s.waarde === waarde) ?? null
}

/** Datum van vandaag in Nederland als YYYY-MM-DD */
export function vandaagNL() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })
}

/** Een bezoekverzoek telt als 'open' tot 2 dagen na aanvragen */
export const BEZOEK_GELDIG_UUR = 48
