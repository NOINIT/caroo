import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AgendaClient } from './AgendaClient'

export default async function AgendaPage({ params }: { params: { id: string } }) {
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

  if (!groep?.betaald) {
    redirect(`/betalen?groep=${params.id}`)
  }

  // Haal afspraken op voor de komende 3 maanden
  const start = new Date()
  start.setDate(1)
  const eind = new Date()
  eind.setMonth(eind.getMonth() + 3)

  const [{ data: afspraken }, { data: categorieen }] = await Promise.all([
    supabase
      .from('afspraken')
      .select(`
        id, titel, beschrijving, start_tijd, eind_tijd,
        agenda_categorieen (id, naam, kleur)
      `)
      .eq('groep_id', params.id)
      .gte('start_tijd', start.toISOString())
      .lte('start_tijd', eind.toISOString())
      .order('start_tijd', { ascending: true }),

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
          <h1 className="font-bold text-caroo-donker">Agenda — {groep.naam}</h1>
        </div>
      </header>
      <AgendaClient
        groepId={params.id}
        afspraken={(afspraken || []) as any}
        categorieen={categorieen || []}
      />
    </div>
  )
}
