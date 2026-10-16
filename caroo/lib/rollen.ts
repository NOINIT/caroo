import type { Rol } from '@/types/database'

/** Hoe rollen in de app heten. Intern blijft de waarde 'oudere'. */
export const rolLabels: Record<Rol, string> = {
  groepsbeheerder: 'Groepsbeheerder',
  mantelzorger: 'Mantelzorger',
  oudere: 'Hoofdpersoon',
}

export function rolLabel(rol: string) {
  return rolLabels[rol as Rol] ?? rol
}
