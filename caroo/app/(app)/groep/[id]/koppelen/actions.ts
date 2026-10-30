'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { magKoppelen, maakKoppelcode, voegHoofdpersoonToe } from '@/lib/koppelen'
import { magGebruiken } from '@/lib/opzeggen'
import { getT } from '@/lib/i18n/server'

async function groepMagGebruiken(groepId: string) {
  const { data } = await createServiceClient()
    .from('zorggroepen').select('betaald, gestopt_op, aangemaakt_op').eq('id', groepId).maybeSingle()
  return !!data && magGebruiken(data)
}

export async function maakCode(groepId: string, hoofdpersoonId: string) {
  const { t } = await getT()
  const user = await magKoppelen(groepId)
  if (!user) return { error: t('koppelen.geenRechten') }
  if (!(await groepMagGebruiken(groepId))) return { error: t('koppelen.mislukt') }
  const code = await maakKoppelcode(groepId, hoofdpersoonId, user.id)
  return code ?? { error: t('koppelen.mislukt') }
}

export async function voegToeEnMaakCode(groepId: string, naam: string, email: string) {
  const { t, taal } = await getT()
  const user = await magKoppelen(groepId)
  if (!user) return { error: t('koppelen.geenRechten') }
  if (!(await groepMagGebruiken(groepId))) return { error: t('koppelen.mislukt') }
  if (!naam.trim()) return { error: t('auth.vulAlles') }
  const schoon = email.trim()
  if (schoon && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(schoon)) return { error: t('koppelen.mislukt') }

  const r = await voegHoofdpersoonToe(groepId, naam, schoon || null, taal)
  if ('error' in r) return { error: r.error === 'bestaat' ? t('koppelen.bestaat') : t('koppelen.mislukt') }
  const code = await maakKoppelcode(groepId, r.userId, user.id)
  return code ? { ...code, hoofdpersoon: { id: r.userId, naam: naam.trim() } } : { error: t('koppelen.mislukt') }
}
