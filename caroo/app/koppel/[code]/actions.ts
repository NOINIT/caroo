'use server'

import { redirect } from 'next/navigation'
import { gebruikKoppelcode } from '@/lib/koppelen'

export async function koppel(code: string) {
  const r = await gebruikKoppelcode(code)
  if (!r) return { error: true }
  redirect(`/oudere/${r.groepId}?nieuw=1`)
}
