export type Lettergrootte = 'klein' | 'normaal' | 'groot' | 'extra'

export const LETTERGROOTTES: { waarde: Lettergrootte; label: string; px: number }[] = [
  { waarde: 'klein', label: 'Klein', px: 15 },
  { waarde: 'normaal', label: 'Normaal', px: 16 },
  { waarde: 'groot', label: 'Groot', px: 18 },
  { waarde: 'extra', label: 'Extra groot', px: 21 },
]

export function lettergroottePx(waarde: string | null | undefined) {
  return LETTERGROOTTES.find(l => l.waarde === waarde)?.px ?? 16
}
