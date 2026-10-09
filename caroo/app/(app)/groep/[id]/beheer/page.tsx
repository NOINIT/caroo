import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BeheerClient } from './BeheerClient'

export default async function BeheerPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['groepsbeheerder'])
  if (!heeftToegang) redirect(`/groep/${params.id}`)

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald')
    .eq('id', params.id)
    .single()

  if (!groep?.betaald) redirect(`/betalen?groep=${params.id}`)

  const [{ data: leden }, { data: categorieen }] = await Promise.all([
    supabase
      .from('groepsleden')
      .select('id, rol, lid_sinds, users (id, naam, email)')
      .eq('groep_id', params.id)
      .order('lid_sinds', { ascending: true }),

    supabase
      .from('agenda_categorieen')
      .select('id, naam, kleur, systeem')
      .eq('groep_id', params.id)
      .order('systeem', { ascending: false }),
  ])

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-500">←</Link>
          <h1 className="font-bold text-caroo-donker">Beheer — {groep.naam}</h1>
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
