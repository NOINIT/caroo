import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { magKoppelen } from '@/lib/koppelen'
import { getT } from '@/lib/i18n/server'
import { vriendenVanGroep, vriendVerzoekenVanGroep, MAX_VRIENDEN } from '@/lib/vrienden'
import { magGebruiken } from '@/lib/opzeggen'
import { VriendenBeheer } from './VriendenBeheer'

export default async function VriendenPage({ params, searchParams }: { params: { id: string }; searchParams: { verzoek?: string } }) {
  const user = await magKoppelen(params.id)
  if (!user) redirect(`/groep/${params.id}`)
  const { t } = await getT()

  const service = createServiceClient()
  const [{ data: groep }, { data: leden }, vrienden, verzoeken, { data: ik }] = await Promise.all([
    service.from('zorggroepen').select('naam, betaald, gestopt_op, aangemaakt_op').eq('id', params.id).single(),
    service.from('groepsleden').select('user_id, users:user_id (naam)').eq('groep_id', params.id).eq('rol', 'oudere'),
    vriendenVanGroep(params.id),
    vriendVerzoekenVanGroep(params.id),
    service.from('groepsleden').select('rol').eq('groep_id', params.id).eq('user_id', user.id).maybeSingle(),
  ])
  // Kwam je hier via "Ik regel het"? Dan hoort de uitnodiging bij die vraag
  const verzoek = verzoeken.find(v => v.id === searchParams.verzoek) || null
  if (!groep || !magGebruiken(groep)) redirect(`/groep/${params.id}`)
  const hoofdpersonen = (leden || []).map((l: any) => ({ id: l.user_id as string, naam: (l.users?.naam as string) || t('algemeen.deHoofdpersoon') }))

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Link href={`/groep/${params.id}`} className="text-sm text-caroo-groen hover:underline">
        <span className="inline-block rtl:rotate-180">←</span> {groep?.naam}
      </Link>
      <h1 className="text-2xl font-bold text-caroo-donker mt-3 mb-2">{t('vrienden.familie.titel')}</h1>
      <p className="text-sm text-gray-600 mb-6">🔒 {t('vrienden.familie.privacy')}</p>
      {hoofdpersonen.length === 0 ? (
        <p className="text-gray-600">
          <Link href={`/groep/${params.id}/koppelen`} className="text-caroo-groen underline">{t('koppelen.koppelLink')}</Link>
        </p>
      ) : (
        <VriendenBeheer groepId={params.id} hoofdpersonen={hoofdpersonen} actief={vrienden.actief} open={vrienden.open} zelf={vrienden.zelf} verzoek={verzoek} isBeheerder={ik?.rol === 'groepsbeheerder'} max={MAX_VRIENDEN} />
      )}
    </div>
  )
}
