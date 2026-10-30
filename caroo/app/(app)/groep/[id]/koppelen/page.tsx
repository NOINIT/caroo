import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { magKoppelen, isGeenEmail } from '@/lib/koppelen'
import { getT } from '@/lib/i18n/server'
import { KoppelClient } from './KoppelClient'
import { bekijkVriendUitnodiging } from '@/lib/acties/vrienden'

export default async function KoppelenPage({ params, searchParams }: { params: { id: string }; searchParams: { terug?: string } }) {
  const user = await magKoppelen(params.id)
  if (!user) redirect(`/groep/${params.id}`)
  const { t } = await getT()

  const service = createServiceClient()
  const [{ data: groep }, { data: leden }] = await Promise.all([
    service.from('zorggroepen').select('naam').eq('id', params.id).single(),
    service.from('groepsleden').select('user_id, users:user_id (naam, email)').eq('groep_id', params.id).eq('rol', 'oudere'),
  ])
  // Kwam je hier via een vrienduitnodiging? Dan een knop terug, met de naam van wie uitnodigde
  const terug = /^\/vriend\/[A-Za-z0-9_-]{20,64}$/.test(searchParams.terug || '') ? searchParams.terug! : null
  const uitnodiging = terug ? await bekijkVriendUitnodiging(terug.slice(8)) : null
  const hoofdpersonen = (leden || []).map((l: any) => ({
    id: l.user_id as string,
    naam: (l.users?.naam as string) || t('algemeen.deHoofdpersoon'),
    geenEmail: isGeenEmail(l.users?.email),
  }))

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Link href={`/groep/${params.id}`} className="text-sm text-caroo-groen hover:underline">
        <span className="inline-block rtl:rotate-180">←</span> {groep?.naam}
      </Link>
      <h1 className="text-2xl font-bold text-caroo-donker mt-3 mb-2">{t('koppelen.titel')}</h1>
      <p className="text-gray-600 mb-6">{t('koppelen.intro')}</p>
      <KoppelClient groepId={params.id} hoofdpersonen={hoofdpersonen} terug={uitnodiging ? { url: terug!, naam: uitnodiging.naam.split(' ')[0] } : null} />
    </div>
  )
}
