import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UitnodigingFormulier } from './UitnodigingFormulier'
import { getT } from '@/lib/i18n/server'
import { magGebruiken } from '@/lib/opzeggen'

export default async function UitnodigingPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['groepsbeheerder'])
  if (!heeftToegang) redirect('/dashboard')

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald, gestopt_op, aangemaakt_op')
    .eq('id', params.id)
    .single()

  if (!groep || !magGebruiken(groep)) redirect(`/betalen?groep=${params.id}`)

  // Openstaande uitnodigingen
  const { data: uitnodigingen } = await supabase
    .from('uitnodigingen')
    .select('id, email, rol, gebruikt, verloopt_op, aangemaakt_op')
    .eq('groep_id', params.id)
    .eq('gebruikt', false)
    .gt('verloopt_op', new Date().toISOString())
    .order('aangemaakt_op', { ascending: false })
    .limit(10)

  const { t } = await getT()
  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-600 inline-block rtl:rotate-180">←</Link>
          <h1 className="font-bold text-caroo-donker">{t('uitnodigen.titel')} — {groep.naam}</h1>
        </div>
      </header>
      <UitnodigingFormulier
        groepId={params.id}
        groepNaam={groep.naam}
        uitnodigingen={uitnodigingen || []}
      />
    </div>
  )
}
