import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DagboekClient } from './DagboekClient'
import { getT } from '@/lib/i18n/server'

export default async function DagboekPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['mantelzorger', 'groepsbeheerder'])
  if (!heeftToegang) redirect('/dashboard')

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald')
    .eq('id', params.id)
    .single()

  if (!groep?.betaald) redirect(`/betalen?groep=${params.id}`)

  const { data: entries } = await supabase
    .from('dagboek')
    .select('id, inhoud, gesproken, aangemaakt_op, auteur_naam, users (naam)')
    .eq('groep_id', params.id)
    .order('aangemaakt_op', { ascending: false })
    .limit(50)

  const { t } = await getT()
  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-500 inline-block rtl:rotate-180">←</Link>
          <h1 className="font-bold text-caroo-donker">{t('groep.tegels.dagboek')} — {groep.naam}</h1>
        </div>
      </header>
      <DagboekClient
        groepId={params.id}
        entries={(entries || []) as any}
      />
    </div>
  )
}
