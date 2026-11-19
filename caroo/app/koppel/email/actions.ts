'use server'

import { bevestigKoppelEmail } from '@/lib/koppelen'

export async function bevestig(token: string) {
  return bevestigKoppelEmail(token)
}
