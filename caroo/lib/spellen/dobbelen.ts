/**
 * Dobbelen: vijf stenen, drie keer gooien per beurt, dertien vakken per speler.
 * Pure functies, zodat de server de regels controleert en het scherm dezelfde punten toont.
 */

export const VAKKEN = [
  'enen', 'tweeen', 'drieen', 'vieren', 'vijven', 'zessen',
  'drieGelijk', 'vierGelijk', 'fullHouse', 'kleineStraat', 'groteStraat', 'vijfGelijk', 'kans',
] as const
export type Vak = typeof VAKKEN[number]
export const BOVEN: Vak[] = ['enen', 'tweeen', 'drieen', 'vieren', 'vijven', 'zessen']
export const BONUS_GRENS = 63
export const BONUS = 35

export interface Dobbelen {
  spelers: [string, string]
  stenen: number[]          // vijf stenen, 0 = nog niet gegooid
  vast: boolean[]
  worpen: number            // al gegooid deze beurt (0 tot 3)
  kaart: Record<string, Partial<Record<Vak, number>>>
}

export function nieuwDobbelen(eerste: string, tweede: string): Dobbelen {
  return { spelers: [eerste, tweede], stenen: [0, 0, 0, 0, 0], vast: [false, false, false, false, false], worpen: 0, kaart: { [eerste]: {}, [tweede]: {} } }
}

function telling(stenen: number[]) {
  const n = [0, 0, 0, 0, 0, 0, 0]
  for (const s of stenen) n[s]++
  return n
}

export function punten(vak: Vak, stenen: number[]): number {
  if (stenen.some(s => s < 1)) return 0
  const n = telling(stenen)
  const som = stenen.reduce((a, b) => a + b, 0)
  const boven = BOVEN.indexOf(vak)
  if (boven >= 0) return n[boven + 1] * (boven + 1)
  const max = Math.max(...n)
  const reeks = (lengte: number) => {
    let rij = 0
    for (let i = 1; i <= 6; i++) { rij = n[i] ? rij + 1 : 0; if (rij >= lengte) return true }
    return false
  }
  switch (vak) {
    case 'drieGelijk': return max >= 3 ? som : 0
    case 'vierGelijk': return max >= 4 ? som : 0
    case 'fullHouse': return n.includes(3) && n.includes(2) ? 25 : 0
    case 'kleineStraat': return reeks(4) ? 30 : 0
    case 'groteStraat': return reeks(5) ? 40 : 0
    case 'vijfGelijk': return max === 5 ? 50 : 0
    case 'kans': return som
  }
  return 0
}

export function totaal(kaart: Partial<Record<Vak, number>>) {
  const boven = BOVEN.reduce((a, v) => a + (kaart[v] ?? 0), 0)
  const bonus = boven >= BONUS_GRENS ? BONUS : 0
  const rest = VAKKEN.filter(v => !BOVEN.includes(v)).reduce((a, v) => a + (kaart[v] ?? 0), 0)
  return { boven, bonus, totaal: boven + bonus + rest }
}

export function klaar(s: Dobbelen) {
  return s.spelers.every(p => VAKKEN.every(v => s.kaart[p]?.[v] !== undefined))
}

/** Gooi de stenen die niet vastgehouden worden. `kans` levert getallen van 1 tot 6 (de server gebruikt crypto). */
export function gooi(s: Dobbelen, vast: boolean[], kans: () => number): Dobbelen | string {
  if (s.worpen >= 3) return 'op'
  const houd = s.worpen === 0 ? [false, false, false, false, false] : vast.slice(0, 5).map(Boolean)
  const stenen = s.stenen.map((st, i) => (houd[i] ? st : kans()))
  return { ...s, stenen, vast: houd, worpen: s.worpen + 1 }
}

export function kiesVak(s: Dobbelen, speler: string, vak: Vak): Dobbelen | string {
  if (s.worpen === 0) return 'eerstGooien'
  if (!VAKKEN.includes(vak)) return 'fout'
  if (s.kaart[speler]?.[vak] !== undefined) return 'bezet'
  const kaart = { ...s.kaart, [speler]: { ...s.kaart[speler], [vak]: punten(vak, s.stenen) } }
  return { ...s, kaart, stenen: [0, 0, 0, 0, 0], vast: [false, false, false, false, false], worpen: 0 }
}

export function winnaar(s: Dobbelen): string | null | 'gelijk' {
  if (!klaar(s)) return null
  const [a, b] = s.spelers
  const ta = totaal(s.kaart[a]).totaal, tb = totaal(s.kaart[b]).totaal
  return ta === tb ? 'gelijk' : ta > tb ? a : b
}
