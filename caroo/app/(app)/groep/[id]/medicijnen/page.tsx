import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MedicijnenClient } from './MedicijnenClient'

export default async function MedicijnenPage({ params }: { params: { id: string } }) {
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

  const vandaag = new Date().toISOString().split('T')[0]

  const [{ data: medicijnen }, { data: registraties }] = await Promise.all([
    supabase
      .from('medicijnen')
      .select('id, naam, dosering, tijdstippen, opmerkingen, actief')
      .eq('groep_id', params.id)
      .eq('actief', true)
      .order('naam'),

    supabase
      .from('medicijn_registraties')
      .select('medicijn_id, tijdstip, ingenomen')
      .eq('groep_id', params.id)
      .eq('datum', vandaag),
  ])

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-500">←</Link>
          <h1 className="font-bold text-caroo-donker">Medicijnen — {groep.naam}</h1>
        </div>
      </header>
      <MedicijnenClient
        groepId={params.id}
        medicijnen={medicijnen || []}
        registratiesVandaag={registraties || []}
        vandaag={vandaag}
      />
    </div>
  )
}
