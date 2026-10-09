import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DagboekClient } from './DagboekClient'

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
    .select('id, inhoud, stemming, gesproken, aangemaakt_op, users (naam)')
    .eq('groep_id', params.id)
    .order('aangemaakt_op', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-500">←</Link>
          <h1 className="font-bold text-caroo-donker">Dagboek — {groep.naam}</h1>
        </div>
      </header>
      <DagboekClient
        groepId={params.id}
        entries={(entries || []) as any}
      />
    </div>
  )
}
