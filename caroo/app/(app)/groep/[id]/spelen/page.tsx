import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'
import { magGebruiken } from '@/lib/opzeggen'
import { Spellen } from '@/components/oudere/Spellen'

/** Een familielid speelt een spelletje met de hoofdpersoon uit de eigen groep */
export default async function SpelenPage({ params, searchParams }: { params: { id: string }; searchParams: { met?: string } }) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) redirect('/login')
  const { t } = await getT()
  const service = createServiceClient()
  const [{ data: groep }, { data: ik }, { data: hoofdpersonen }] = await Promise.all([
    service.from('zorggroepen').select('naam, betaald, gestopt_op, aangemaakt_op').eq('id', params.id).maybeSingle(),
    service.from('groepsleden').select('rol').eq('groep_id', params.id).eq('user_id', user.id).maybeSingle(),
    service.from('groepsleden').select('user_id, users:user_id (naam)').eq('groep_id', params.id).eq('rol', 'oudere'),
  ])
  if (!groep || !ik || ik.rol === 'oudere' || !magGebruiken(groep)) redirect(`/groep/${params.id}`)
  const lijst = (hoofdpersonen || []).map((h: any) => ({ id: h.user_id as string, naam: (h.users?.naam as string) || t('algemeen.deHoofdpersoon') }))
  const met = lijst.find(h => h.id === searchParams.met) || lijst[0]
  if (!met) redirect(`/groep/${params.id}`)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href={`/groep/${params.id}`} className="text-sm text-caroo-groen hover:underline">
        <span className="inline-block rtl:rotate-180">←</span> {groep.naam}
      </Link>
      <h1 className="text-2xl font-bold text-caroo-donker mt-3 mb-4">{t('spellen.titelMet', { naam: met.naam.split(' ')[0] })}</h1>
      <Spellen doel={{ groep: params.id, met: met.id }} tegenNaam={met.naam} />
    </div>
  )
}
