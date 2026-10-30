import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { bekijkVriendUitnodiging } from '@/lib/acties/vrienden'
import { Akkoord, ZelfJa } from './Akkoord'

export const metadata = { robots: { index: false } }

// De andere familie geeft hier akkoord. Er gebeurt pas iets na een tik op Akkoord,
// zodat een voorbeeldweergave (bijv. in WhatsApp) de uitnodiging niet opmaakt.
export default async function VriendUitnodiging({ params }: { params: { code: string } }) {
  const { t } = await getT()
  const uitnodiging = await bekijkVriendUitnodiging(params.code)
  const { data: { user } } = await createClient().auth.getUser()

  let keuzes: { groepId: string; groepNaam: string; id: string; naam: string }[] = []
  // Groep zonder hoofdpersoon: daar kan de familie de hoofdpersoon nog aan toevoegen
  let groepZonderHoofdpersoon: { id: string; naam: string } | null = null
  if (user && uitnodiging) {
    const service = createServiceClient()
    const { data: mijn } = await service.from('groepsleden').select('groep_id, rol, zorggroepen (naam)')
      .eq('user_id', user.id).in('rol', ['groepsbeheerder', 'mantelzorger'])
    const groepIds = (mijn || []).map(m => m.groep_id as string)
    if (groepIds.length) {
      const { data: ouderen } = await service.from('groepsleden').select('groep_id, user_id, users:user_id (naam)')
        .in('groep_id', groepIds).eq('rol', 'oudere')
      keuzes = (ouderen || [])
        .filter(o => o.user_id !== uitnodiging.persoonA)
        .map((o: any) => ({
          groepId: o.groep_id,
          groepNaam: ((mijn || []).find(m => m.groep_id === o.groep_id) as any)?.zorggroepen?.naam || '',
          id: o.user_id,
          naam: o.users?.naam || t('algemeen.deHoofdpersoon'),
        }))
      const metHoofdpersoon = new Set((ouderen || []).map(o => o.groep_id as string))
      const leeg = (mijn || []).find(m => !metHoofdpersoon.has(m.groep_id as string))
      if (leeg) groepZonderHoofdpersoon = { id: leeg.groep_id as string, naam: (leeg as any).zorggroepen?.naam || '' }
    }
  }
  const terug = encodeURIComponent(`/vriend/${params.code}`)
  // Opent de hoofdpersoon de link zelf op haar tablet?
  let hoofdpersoon: { groepId: string; zelf: boolean } | null = null
  if (user && uitnodiging) {
    const { data: rij } = await createServiceClient().from('groepsleden').select('groep_id, vrienden_zelf')
      .eq('user_id', user.id).eq('rol', 'oudere').limit(1).maybeSingle()
    if (rij) hoofdpersoon = { groepId: rij.groep_id as string, zelf: !!rij.vrienden_zelf }
  }

  const voornaam = uitnodiging?.naam.split(' ')[0] || ''
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col items-center px-6 py-10">
      <CarooLogo size="lg" />
      <div className="mt-8 w-full max-w-md">
        {!uitnodiging ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-caroo-donker">{t('vrienden.familie.ongeldig')}</h1>
            <p className="text-gray-700 mt-3">{t('vrienden.familie.ongeldigTekst')}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-caroo-donker text-center">👭 {t('vrienden.familie.uitnodigingTitel', { naam: voornaam })}</h1>
            <p className="text-gray-700 mt-3 mb-6 text-center">{t('vrienden.familie.uitnodigingTekst', { naam: voornaam })}</p>
            {hoofdpersoon ? (
              hoofdpersoon.zelf && user!.id !== uitnodiging.persoonA ? (
                <ZelfJa code={params.code} groepId={hoofdpersoon.groepId} naam={voornaam} />
              ) : (
                <p className="caroo-card text-ou-lg text-gray-700 text-center">{t('vrienden.familie.laatFamilieZien')}</p>
              )
            ) : !user ? (
              <div className="caroo-card text-center space-y-4">
                <p className="text-lg font-bold text-caroo-donker">{t('vrienden.familie.nogGeenClanoo')}</p>
                <p className="text-gray-700">{t('vrienden.familie.beginUitleg')}</p>
                <Link href={`/registreer?redirect=${terug}`} className="btn-primary block">{t('vrienden.familie.beginGratis')}</Link>
                <Link href={`/login?redirect=${terug}`} className="block text-sm text-caroo-groen underline">{t('vrienden.familie.alAccount')}</Link>
              </div>
            ) : keuzes.length === 0 && groepZonderHoofdpersoon ? (
              <div className="caroo-card text-center space-y-4">
                <p className="text-gray-700">{t('vrienden.familie.stapHoofdpersoon', { groep: groepZonderHoofdpersoon.naam })}</p>
                <Link href={`/groep/${groepZonderHoofdpersoon.id}/koppelen?terug=${terug}`} className="btn-primary block">{t('vrienden.familie.voegToe')}</Link>
              </div>
            ) : keuzes.length === 0 ? (
              <div className="caroo-card text-center space-y-4">
                <p className="text-gray-700">{t('vrienden.familie.stapGroep')}</p>
                <Link href={`/groep/aanmaken?terug=${terug}`} className="btn-primary block">{t('vrienden.familie.maakGroep')}</Link>
              </div>
            ) : (
              <Akkoord code={params.code} keuzes={keuzes} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
