'use client'

import { createClient } from '@/lib/supabase/client'

/** Taak afvinken of weer open zetten. Onthoudt wie het deed, zodat iedereen het ziet. */
export async function zetTaakGedaan(taakId: string, gedaan: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase.from('taken').update({
    voltooid: gedaan,
    voltooid_door: gedaan ? user.id : null,
    voltooid_op: gedaan ? new Date().toISOString() : null,
  }).eq('id', taakId)
  return !error
}

/** Een taak als afspraak in de agenda zetten, op de deadline (of morgen 09:00) */
export async function zetTaakInAgenda(groepId: string, titel: string, deadline: string | null) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  let start: Date
  if (deadline) {
    start = new Date(deadline)
    if (start.getHours() === 0 && start.getMinutes() === 0) start.setHours(9, 0, 0, 0)
  } else {
    start = new Date(); start.setDate(start.getDate() + 1); start.setHours(9, 0, 0, 0)
  }
  const { error } = await supabase.from('afspraken').insert({
    groep_id: groepId, titel, start_tijd: start.toISOString(), aangemaakt_door: user.id,
  })
  return !error
}

/** Afgevinkt in de afgelopen dag: dan blijft hij nog even doorgestreept staan bij de open taken */
export function netGedaan(voltooidOp: string | null | undefined) {
  return !!voltooidOp && Date.now() - new Date(voltooidOp).getTime() < 24 * 3600 * 1000
}
