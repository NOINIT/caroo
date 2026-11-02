/**
 * Schaken met de regels uit chess.js (BSD-licentie). We bewaren de stand als FEN-tekst.
 * Promotie gaat automatisch naar een dame: dat is voor bijna iedereen de bedoeling en scheelt een vraag.
 */
import { Chess } from 'chess.js'

export interface Schaken { fen: string; wit: string; zwart: string; laatste: { van: string; naar: string } | null }

export function nieuwSchaken(wit: string, zwart: string): Schaken {
  return { fen: new Chess().fen(), wit, zwart, laatste: null }
}

export function aanZet(s: Schaken): 'w' | 'b' {
  return new Chess(s.fen).turn()
}

/** Velden waar het stuk op `van` heen mag */
export function doelen(s: Schaken, van: string): string[] {
  try {
    return new Chess(s.fen).moves({ square: van as any, verbose: true }).map(m => m.to)
  } catch { return [] }
}

export function doeZet(s: Schaken, van: string, naar: string): Schaken | string {
  const spel = new Chess(s.fen)
  try {
    spel.move({ from: van, to: naar, promotion: 'q' })
  } catch { return 'ongeldig' }
  return { ...s, fen: spel.fen(), laatste: { van, naar } }
}

export function status(s: Schaken): { schaak: boolean; uitslag: 'w' | 'b' | 'gelijk' | null } {
  const spel = new Chess(s.fen)
  if (spel.isCheckmate()) return { schaak: true, uitslag: spel.turn() === 'w' ? 'b' : 'w' }
  if (spel.isDraw() || spel.isStalemate()) return { schaak: false, uitslag: 'gelijk' }
  return { schaak: spel.inCheck(), uitslag: null }
}

/** Het bord als 8 rijen van boven (rij 8) naar beneden, elk veld met naam en stuk */
export function bord(s: Schaken) {
  return new Chess(s.fen).board().map((rij, r) => rij.map((v, c) => ({
    veld: 'abcdefgh'[c] + (8 - r),
    stuk: v ? (v.color === 'w' ? v.type.toUpperCase() : v.type) : null,
  })))
}
