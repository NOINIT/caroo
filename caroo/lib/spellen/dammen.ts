/**
 * Dammen volgens de internationale regels (10 bij 10).
 * Schijven gaan schuin vooruit, slaan mag vooruit en achteruit. Slaan is verplicht,
 * en je moet de zet kiezen die de meeste stukken slaat. Een dam vliegt over de diagonaal.
 * Een schijf wordt pas dam als hij zijn zet op de overkant eindigt.
 * Pure functies: de server controleert, het scherm toont dezelfde mogelijke zetten.
 */

export type Kleur = 'w' | 'z'
export type Stuk = 'w' | 'W' | 'z' | 'Z' | null   // hoofdletter = dam
export interface Dammen { bord: Stuk[]; aanZet: Kleur; wit: string; zwart: string; zettenZonderSlag: number }
/** Een zet: de velden die de steen aandoet (eerste = begin), en welke velden geslagen worden */
export interface DamZet { pad: number[]; geslagen: number[] }

const N = 10
const rc = (i: number) => [Math.floor(i / N), i % N] as const
const idx = (r: number, c: number) => (r >= 0 && r < N && c >= 0 && c < N ? r * N + c : -1)
export const isDonker = (i: number) => { const [r, c] = rc(i); return (r + c) % 2 === 1 }
const kleurVan = (s: Stuk): Kleur | null => (s ? (s.toLowerCase() as Kleur) : null)
const isDam = (s: Stuk) => s === 'W' || s === 'Z'
const RICHTINGEN = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const

export function nieuwDammen(wit: string, zwart: string): Dammen {
  const bord: Stuk[] = Array(N * N).fill(null)
  for (let i = 0; i < N * N; i++) {
    if (!isDonker(i)) continue
    const [r] = rc(i)
    if (r <= 3) bord[i] = 'z'
    if (r >= 6) bord[i] = 'w'
  }
  return { bord, aanZet: 'w', wit, zwart, zettenZonderSlag: 0 }
}

/** Wit speelt naar boven (rij 0), zwart naar beneden */
const vooruit = (k: Kleur) => (k === 'w' ? -1 : 1)

function slagenVanaf(bord: Stuk[], start: number, stuk: Stuk, pos: number, geslagen: number[], pad: number[], uit: DamZet[]) {
  const kleur = kleurVan(stuk)!
  const [r, c] = rc(pos)
  let verder = false
  for (const [dr, dc] of RICHTINGEN) {
    if (isDam(stuk)) {
      // Vliegen: lege velden, dan precies één tegenstander, dan landen op een leeg veld
      let rr = r + dr, cc = c + dc
      while (idx(rr, cc) >= 0 && (bord[idx(rr, cc)] === null || idx(rr, cc) === start)) { rr += dr; cc += dc }
      const doel = idx(rr, cc)
      if (doel < 0 || geslagen.includes(doel) || kleurVan(bord[doel]) === kleur || bord[doel] === null) continue
      let lr = rr + dr, lc = cc + dc
      while (idx(lr, lc) >= 0 && (bord[idx(lr, lc)] === null || idx(lr, lc) === start)) {
        verder = true
        const land = idx(lr, lc)
        slagenVanaf(bord, start, stuk, land, [...geslagen, doel], [...pad, land], uit)
        lr += dr; lc += dc
      }
    } else {
      const doel = idx(r + dr, c + dc), land = idx(r + 2 * dr, c + 2 * dc)
      if (doel < 0 || land < 0) continue
      if (geslagen.includes(doel) || bord[doel] === null || kleurVan(bord[doel]) === kleur) continue
      if (bord[land] !== null && land !== start) continue
      verder = true
      slagenVanaf(bord, start, stuk, land, [...geslagen, doel], [...pad, land], uit)
    }
  }
  if (!verder && geslagen.length) uit.push({ pad, geslagen })
}

/** Alle toegestane zetten voor wie aan zet is */
export function zetten(s: Dammen): DamZet[] {
  const slagen: DamZet[] = []
  const gewoon: DamZet[] = []
  for (let i = 0; i < N * N; i++) {
    const stuk = s.bord[i]
    if (kleurVan(stuk) !== s.aanZet) continue
    slagenVanaf(s.bord, i, stuk, i, [], [i], slagen)
    const [r, c] = rc(i)
    for (const [dr, dc] of RICHTINGEN) {
      if (isDam(stuk)) {
        let rr = r + dr, cc = c + dc
        while (idx(rr, cc) >= 0 && s.bord[idx(rr, cc)] === null) { gewoon.push({ pad: [i, idx(rr, cc)], geslagen: [] }); rr += dr; cc += dc }
      } else if (dr === vooruit(s.aanZet)) {
        const doel = idx(r + dr, c + dc)
        if (doel >= 0 && s.bord[doel] === null) gewoon.push({ pad: [i, doel], geslagen: [] })
      }
    }
  }
  if (slagen.length) {
    const max = Math.max(...slagen.map(z => z.geslagen.length))
    return slagen.filter(z => z.geslagen.length === max)
  }
  return gewoon
}

export function doeZet(s: Dammen, pad: number[]): Dammen | string {
  const zet = zetten(s).find(z => z.pad.length === pad.length && z.pad.every((v, i) => v === pad[i]))
  if (!zet) return 'ongeldig'
  const bord = [...s.bord]
  const van = zet.pad[0], naar = zet.pad[zet.pad.length - 1]
  let stuk = bord[van]
  bord[van] = null
  for (const g of zet.geslagen) bord[g] = null
  const [r] = rc(naar)
  if (stuk === 'w' && r === 0) stuk = 'W'
  if (stuk === 'z' && r === N - 1) stuk = 'Z'
  bord[naar] = stuk
  const damZet = isDam(s.bord[van]) && zet.geslagen.length === 0
  return { ...s, bord, aanZet: s.aanZet === 'w' ? 'z' : 'w', zettenZonderSlag: damZet ? s.zettenZonderSlag + 1 : 0 }
}

/** Wie heeft gewonnen? Wie niet meer kan zetten (of geen stukken heeft), verliest. 25 damzetten zonder slag: remise. */
export function uitslag(s: Dammen): Kleur | 'gelijk' | null {
  if (s.zettenZonderSlag >= 50) return 'gelijk'
  if (zetten(s).length === 0) return s.aanZet === 'w' ? 'z' : 'w'
  return null
}
