'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'
import { stripeClient } from '@/lib/stripe-kortingen'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'
import { isGeenEmail } from '@/lib/koppelen'

/**
 * Account verwijderen vanuit de app (eis van de App Store en Google Play, en AVG).
 * Wat iemand in een groep deelde, blijft voor de familie staan zonder naam (migratie 007).
 * Groepen waarvan iemand eigenaar is: zonder andere leden gaat de groep weg; met andere leden
 * wordt een ander familielid eigenaar. Een abonnement stopt aan het einde van de betaalde periode.
 */
export async function verwijderAccount() {
  const { t } = await getT()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('algemeen.nietIngelogd') }
  const service = createServiceClient()

  const { data: groepen } = await service.from('zorggroepen').select('id, naam, betaald, stripe_subscription_id').eq('eigenaar_id', user.id)
  for (const g of groepen || []) {
    if (g.stripe_subscription_id) {
      await stripeClient().subscriptions.update(g.stripe_subscription_id as string, { cancel_at_period_end: true }).catch(e => console.error('Abonnement stoppen mislukt', g.id, e))
    }
    const { data: anderen } = await service.from('groepsleden').select('user_id, rol, beheerder').eq('groep_id', g.id).neq('user_id', user.id)
    if (!anderen?.length) {
      const { error } = await service.from('zorggroepen').delete().eq('id', g.id)
      if (error) { console.error('Groep verwijderen mislukt', g.id, error); return { error: t('account.mislukt') } }
      continue
    }
    // Nieuwe eigenaar: eerst een beheerder, dan familie, als laatste de hoofdpersoon zelf
    const volgorde = (l: { rol: string; beheerder: boolean | null }) => (l.rol === 'groepsbeheerder' || l.beheerder ? 0 : l.rol === 'mantelzorger' ? 1 : 2)
    const nieuw = [...anderen].sort((a, b) => volgorde(a as any) - volgorde(b as any))[0] as { user_id: string; rol: string }
    const { error } = await service.from('zorggroepen').update({ eigenaar_id: nieuw.user_id }).eq('id', g.id)
    if (error) { console.error('Eigenaar overzetten mislukt', g.id, error); return { error: t('account.mislukt') } }
    await service.from('groepsleden').update(nieuw.rol === 'oudere' ? { beheerder: true } : { rol: 'groepsbeheerder', beheerder: true })
      .eq('groep_id', g.id).eq('user_id', nieuw.user_id)
  }

  const email = user.email
  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) { console.error('Account verwijderen mislukt', user.id, error); return { error: t('account.mislukt') } }
  await supabase.auth.signOut().catch(() => {})

  if (email && !isGeenEmail(email)) {
    await stuurMail({
      naar: email, onderwerp: t('account.mailOnderwerp'), replyTo: MERK.contact,
      html: `<div style="font-family:Arial,sans-serif;font-size:17px;line-height:1.55;color:#1A2F5A;max-width:560px"><p>${escapeHtml(t('account.mailTekst'))}</p><p>Clanoo · NOINIT</p></div>`,
    }).catch(() => {})
  }
  return { ok: true }
}
