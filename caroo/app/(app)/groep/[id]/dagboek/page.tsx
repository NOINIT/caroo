import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DagboekClient } from './DagboekClient'
import { getT } from '@/lib/i18n/server'
import { magGebruiken } from '@/lib/opzeggen'

export default async function DagboekPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['mantelzorger', 'groepsbeheerder'])
  if (!heeftToegang) redirect('/dashboard')

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald, gestopt_op, aangemaakt_op')
    .eq('id', params.id)
    .single()

  if (!groep || !magGebruiken(groep)) redirect(`/betalen?groep=${params.id}`)

  const { data: hoofdpersonen } = await supabase
    .from('groepsleden').select('user_id').eq('groep_id', params.id).eq('rol', 'oudere')
  const hoofdpersoonIds = (hoofdpersonen || []).map(h => h.user_id as string)

  const { data: entries } = await supabase
    .from('dagboek')
    .select('id, inhoud, gesproken, aangemaakt_op, auteur_naam, users (naam)')
    .eq('groep_id', params.id)
    // De verhalen van de hoofdpersoon staan in het verhalenboekje, niet in het dagboek van de familie
    .not('auteur_id', 'in', `(${hoofdpersoonIds.length ? hoofdpersoonIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    .order('aangemaakt_op', { ascending: false })
    .limit(50)

  const { t } = await getT()
  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-600 inline-block rtl:rotate-180">←</Link>
          <h1 className="font-bold text-caroo-donker">{t('groep.tegels.dagboek')} · {groep.naam}</h1>
        </div>
      </header>
      <DagboekClient
        groepId={params.id}
        entries={(entries || []) as any}
      />
    </div>
  )
}
