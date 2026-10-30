import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import { OudereInterface } from '@/components/oudere/OudereInterface'
import { vandaagNL, BEZOEK_GELDIG_UUR } from '@/lib/stemming'
import { getT } from '@/lib/i18n/server'

export default async function OuderePage({ params, searchParams }: { params: { id: string }; searchParams: { nieuw?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['oudere', 'mantelzorger', 'groepsbeheerder'])
  if (!heeftToegang) redirect('/dashboard')
  const { t } = await getT()

  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const morgen = new Date(vandaag)
  morgen.setDate(morgen.getDate() + 1)
  const bezoekSinds = new Date(Date.now() - BEZOEK_GELDIG_UUR * 3600 * 1000).toISOString()

  const [
    { data: profiel },
    { data: groep },
    { data: dagAfspraken },
    { data: medicijnen },
    { data: fotos },
    { data: stemming },
    { data: bezoek },
    { count: aantalBoodschappen },
  ] = await Promise.all([
    supabase.from('users').select('naam, lettergrootte, geluid, melding_email').eq('id', user.id).single(),
    supabase.from('zorggroepen').select('id, naam').eq('id', params.id).single(),
    supabase
      .from('afspraken')
      .select('id, titel, start_tijd, beschrijving, agenda_categorieen (naam, kleur)')
      .eq('groep_id', params.id)
      .gte('start_tijd', vandaag.toISOString())
      .lt('start_tijd', morgen.toISOString())
      .order('start_tijd', { ascending: true }),
    supabase.from('medicijnen').select('id, naam, dosering, tijdstippen').eq('groep_id', params.id).eq('actief', true),
    supabase
      .from('fotos')
      .select('id, opslag_pad, onderschrift, aangemaakt_op, auteur_naam, users (naam)')
      .eq('groep_id', params.id)
      .order('aangemaakt_op', { ascending: false })
      .limit(6),
    supabase
      .from('stemmingen')
      .select('stemming')
      .eq('groep_id', params.id)
      .eq('user_id', user.id)
      .eq('datum', vandaagNL())
      .maybeSingle(),
    supabase
      .from('bezoekverzoeken')
      .select('id, aangemaakt_op, reactie_naam, reactie_op, reactie_wanneer')
      .eq('groep_id', params.id)
      .eq('aangevraagd_door', user.id)
      .eq('soort', 'bezoek')
      .gt('aangemaakt_op', bezoekSinds)
      .order('aangemaakt_op', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('boodschappen')
      .select('id', { count: 'exact', head: true })
      .eq('groep_id', params.id)
      .eq('op_lijst', true),
  ])

  // Foto's staan in een afgeschermde opslag: tijdelijke links maken
  const fotosMetUrl = await Promise.all(
    (fotos || []).map(async (foto: any) => {
      const { data } = await supabase.storage.from('fotos').createSignedUrl(foto.opslag_pad, 3600)
      return { ...foto, url: data?.signedUrl || '', door: foto.users?.naam || foto.auteur_naam || null }
    })
  )

  return (
    <OudereInterface
      net_gekoppeld={searchParams.nieuw === '1'}
      groepId={params.id}
      userId={user.id}
      email={user.email || ''}
      naam={profiel?.naam || t('oudere.lieveGebruiker')}
      groepNaam={groep?.naam || ''}
      dagAfspraken={dagAfspraken || []}
      medicijnen={medicijnen || []}
      fotos={fotosMetUrl}
      stemmingVandaag={stemming?.stemming ?? null}
      bezoek={bezoek ?? null}
      aantalBoodschappen={aantalBoodschappen ?? 0}
      lettergrootte={profiel?.lettergrootte || 'normaal'}
      geluid={profiel?.geluid ?? true}
      meldingEmail={profiel?.melding_email ?? true}
    />
  )
}
