import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import { OudereInterface } from '@/components/oudere/OudereInterface'

export default async function OuderePage({
  params
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['oudere', 'mantelzorger', 'groepsbeheerder'])
  if (!heeftToegang) redirect('/dashboard')

  // Haal profiel en groepinfo op
  const [{ data: profiel }, { data: groep }] = await Promise.all([
    supabase.from('users').select('naam').eq('id', user.id).single(),
    supabase.from('zorggroepen').select('id, naam').eq('id', params.id).single(),
  ])

  // Haal aankomende afspraken van vandaag op
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const morgen = new Date(vandaag)
  morgen.setDate(morgen.getDate() + 1)

  const { data: dagAfspraken } = await supabase
    .from('afspraken')
    .select(`
      id, titel, start_tijd, beschrijving,
      agenda_categorieen (naam, kleur)
    `)
    .eq('groep_id', params.id)
    .gte('start_tijd', vandaag.toISOString())
    .lt('start_tijd', morgen.toISOString())
    .order('start_tijd', { ascending: true })

  // Haal medicijnen van vandaag op
  const { data: medicijnen } = await supabase
    .from('medicijnen')
    .select('id, naam, dosering, tijdstippen')
    .eq('groep_id', params.id)
    .eq('actief', true)

  // Haal recente foto's op
  const { data: fotos } = await supabase
    .from('fotos')
    .select('id, opslag_pad, onderschrift, aangemaakt_op')
    .eq('groep_id', params.id)
    .order('aangemaakt_op', { ascending: false })
    .limit(6)

  return (
    <OudereInterface
      groepId={params.id}
      naam={profiel?.naam || 'Lieve gebruiker'}
      groepNaam={groep?.naam || ''}
      dagAfspraken={dagAfspraken || []}
      medicijnen={medicijnen || []}
      fotos={fotos || []}
    />
  )
}
