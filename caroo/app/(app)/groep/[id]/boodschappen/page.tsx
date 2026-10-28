import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BoodschappenLijst } from '@/components/boodschappen/BoodschappenLijst'
import { getT } from '@/lib/i18n/server'

export default async function BoodschappenPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['mantelzorger', 'groepsbeheerder', 'oudere'])
  if (!heeftToegang) redirect('/dashboard')

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald')
    .eq('id', params.id)
    .single()

  if (!groep?.betaald) redirect(`/betalen?groep=${params.id}`)

  const { data: items } = await supabase
    .from('boodschappen')
    .select('id, naam, op_lijst, bijgewerkt_op')
    .eq('groep_id', params.id)
    .order('bijgewerkt_op', { ascending: false })

  const { t } = await getT()
  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-600 inline-block rtl:rotate-180">←</Link>
          <h1 className="font-bold text-caroo-donker">{t('boodschappen.paginaTitel')} — {groep.naam}</h1>
        </div>
      </header>
      <div className="px-4 py-4">
        <BoodschappenLijst groepId={params.id} initieel={items || []} />
      </div>
    </div>
  )
}
