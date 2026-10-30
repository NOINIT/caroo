import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { bekijkVriendUitnodiging } from '@/lib/acties/vrienden'
import { Akkoord } from './Akkoord'

export const metadata = { robots: { index: false } }

// De andere familie geeft hier akkoord. Er gebeurt pas iets na een tik op Akkoord,
// zodat een voorbeeldweergave (bijv. in WhatsApp) de uitnodiging niet opmaakt.
export default async function VriendUitnodiging({ params }: { params: { code: string } }) {
  const { t } = await getT()
  const uitnodiging = await bekijkVriendUitnodiging(params.code)
  const { data: { user } } = await createClient().auth.getUser()

  let keuzes: { groepId: string; groepNaam: string; id: string; naam: string }[] = []
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
    }
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
            {!user ? (
              <div className="caroo-card text-center">
                <p className="text-gray-700 mb-4">{t('vrienden.familie.inloggen')}</p>
                <Link href="/login" className="btn-primary inline-block">{t('vrienden.familie.naarInloggen')}</Link>
              </div>
            ) : keuzes.length === 0 ? (
              <p className="caroo-card text-gray-700">{t('vrienden.familie.geenGroep')}</p>
            ) : (
              <Akkoord code={params.code} keuzes={keuzes} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
