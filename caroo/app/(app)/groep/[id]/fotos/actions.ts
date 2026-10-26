'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { getT } from '@/lib/i18n/server'

/**
 * Verwijder een foto (bestand én record).
 * Mag door degene die hem plaatste, of door een groepsbeheerder.
 */
export async function verwijderFoto(groepId: string, fotoId: string) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }

  const service = createServiceClient()
  const { data: foto } = await service
    .from('fotos')
    .select('id, groep_id, uploader_id, opslag_pad')
    .eq('id', fotoId)
    .single()

  if (!foto || foto.groep_id !== groepId) return { error: t('fotos.bestaatNiet') }

  const isPlaatser = foto.uploader_id === user.id
  const isBeheerder = await heeftRecht(groepId, ['groepsbeheerder'])
  if (!isPlaatser && !isBeheerder) return { error: t('fotos.geenRecht') }

  await service.storage.from('fotos').remove([foto.opslag_pad])
  const { error } = await service.from('fotos').delete().eq('id', fotoId)
  if (error) return { error: t('fotos.verwijderenMislukt') }

  return { succes: true }
}
