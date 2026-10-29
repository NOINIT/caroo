import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BeheerClient } from './BeheerClient'
import { getT } from '@/lib/i18n/server'
import { magGebruiken } from '@/lib/opzeggen'

export default async function BeheerPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['groepsbeheerder'])
  if (!heeftToegang) redirect(`/groep/${params.id}`)

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald, gestopt_op, aangemaakt_op')
    .eq('id', params.id)
    .single()

  if (!groep || !magGebruiken(groep)) redirect(`/betalen?groep=${params.id}`)

  const [{ data: leden }, { data: categorieen }] = await Promise.all([
    supabase
      .from('groepsleden')
      .select('id, rol, toegevoegd_op, users (id, naam, email)')
      .eq('groep_id', params.id)
      .order('toegevoegd_op', { ascending: true }),

    supabase
      .from('agenda_categorieen')
      .select('id, naam, kleur, systeem')
      .eq('groep_id', params.id)
      .order('systeem', { ascending: false }),
  ])

  const { t } = await getT()
  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-600 inline-block rtl:rotate-180">←</Link>
          <h1 className="font-bold text-caroo-donker">{t('groep.tegels.beheer')} — {groep.naam}</h1>
        </div>
      </header>
      <BeheerClient
        groepId={params.id}
        huidigGebruikerId={user.id}
        leden={(leden || []) as any}
        categorieen={(categorieen || []) as any}
      />
    </div>
  )
}
