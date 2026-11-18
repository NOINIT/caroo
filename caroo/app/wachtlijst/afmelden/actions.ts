'use server'

import { createServiceClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Afmelden van de wachtlijst. Gaat alleen via de knop, zodat een virusscanner die de link opent niemand afmeldt. */
export async function meldAf(formData: FormData) {
  const code = String(formData.get('c') || '')
  if (!UUID.test(code)) return { ok: false }
  const { error } = await createServiceClient().from('wachtlijst')
    .update({ afgemeld_op: new Date().toISOString(), wil_updates: false })
    .eq('afmeld_code', code).is('afgemeld_op', null)
  return { ok: !error }
}
