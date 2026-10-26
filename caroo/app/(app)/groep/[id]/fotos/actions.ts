'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'

/**
 * Verwijder een foto (bestand én record).
 * Mag door degene die hem plaatste, of door een groepsbeheerder.
 */
export async function verwijderFoto(groepId: string, fotoId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Je bent niet ingelogd.' }

  const service = createServiceClient()
  const { data: foto } = await service
    .from('fotos')
    .select('id, groep_id, uploader_id, opslag_pad')
    .eq('id', fotoId)
    .single()

  if (!foto || foto.groep_id !== groepId) return { error: 'Deze foto bestaat niet (meer).' }

  const isPlaatser = foto.uploader_id === user.id
  const isBeheerder = await heeftRecht(groepId, ['groepsbeheerder'])
  if (!isPlaatser && !isBeheerder) return { error: 'Alleen wie de foto plaatste of de beheerder kan hem verwijderen.' }

  await service.storage.from('fotos').remove([foto.opslag_pad])
  const { error } = await service.from('fotos').delete().eq('id', fotoId)
  if (error) return { error: 'Verwijderen lukte niet. Probeer het nog eens.' }

  return { succes: true }
}
