/** Onderdelen van Clanoo die een beheerder per persoon kan aan- of uitzetten (zie migratie 038, mag_zien). */
export const ONDERDELEN = ['medicijnen', 'stemming', 'dagboek', 'agenda', 'taken', 'fotos', 'boodschappen'] as const
export type Onderdeel = typeof ONDERDELEN[number]

export const RELATIES = ['familie', 'vriend', 'mantelzorger'] as const
export type Relatie = typeof RELATIES[number]

/** Wat iemand standaard niet ziet. Een vriend of kennis ziet geen gezondheid, dagboek en taken. */
export function standaardVerborgen(relatie: Relatie | null | undefined): Onderdeel[] {
  return relatie === 'vriend' ? ['medicijnen', 'stemming', 'dagboek', 'taken'] : []
}

/** Keuze in het uitnodigformulier, vertaald naar rol en relatie */
export const UITNODIG_SOORTEN = ['familie', 'vriend', 'mantelzorger', 'groepsbeheerder', 'oudere'] as const
export type UitnodigSoort = typeof UITNODIG_SOORTEN[number]
export function soortNaarRol(soort: UitnodigSoort): { rol: 'mantelzorger' | 'groepsbeheerder' | 'oudere'; relatie: Relatie | null } {
  if (soort === 'groepsbeheerder') return { rol: 'groepsbeheerder', relatie: 'familie' }
  if (soort === 'oudere') return { rol: 'oudere', relatie: null }
  return { rol: 'mantelzorger', relatie: soort }
}
