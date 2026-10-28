import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import { getT } from '@/lib/i18n/server'
import { toegangVan } from '@/lib/opzeggen'
import { BoekjeInhoud } from './BoekjeInhoud'

/**
 * Alle verhalen en tips van de hoofdpersoon als boekje.
 * Te bewaren als PDF via de printfunctie van de browser.
 * Blijft na het opzeggen nog 30 dagen bereikbaar.
 */
export default async function BoekjePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const lid = await heeftRecht(params.id, ['mantelzorger', 'groepsbeheerder', 'oudere'])
  if (!lid) redirect('/dashboard')

  const { t, taal } = await getT()

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald, gestopt_op')
    .eq('id', params.id)
    .single()
  if (!groep) redirect('/dashboard')
  if (toegangVan(groep).toegang === 'geen') redirect(`/betalen?groep=${params.id}`)

  // Wie zijn de hoofdpersonen van deze groep?
  const { data: hoofdpersonen } = await supabase
    .from('groepsleden')
    .select('user_id, users (naam)')
    .eq('groep_id', params.id)
    .eq('rol', 'oudere')
  const ids = (hoofdpersonen || []).map((h: any) => h.user_id as string)
  const namen = (hoofdpersonen || []).map((h: any) => h.users?.naam).filter(Boolean) as string[]

  const [{ data: verhalen }, { data: tips }] = ids.length
    ? await Promise.all([
        supabase
          .from('dagboek')
          .select('id, inhoud, gesproken, aangemaakt_op')
          .eq('groep_id', params.id)
          .in('auteur_id', ids)
          .order('aangemaakt_op', { ascending: true }),
        supabase
          .from('tips')
          .select('id, tekst, aangemaakt_op')
          .eq('groep_id', params.id)
          .in('auteur_id', ids)
          .order('aangemaakt_op', { ascending: true }),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }]

  const alles = [...(verhalen || []), ...(tips || [])]
  const van = alles.length ? alles.reduce((a, b) => (a.aangemaakt_op < b.aangemaakt_op ? a : b)).aangemaakt_op : null
  const tot = alles.length ? alles.reduce((a, b) => (a.aangemaakt_op > b.aangemaakt_op ? a : b)).aangemaakt_op : null
  const naam = namen.join(' & ') || t('algemeen.deHoofdpersoon')

  return (
    <BoekjeInhoud
      t={t}
      taal={taal}
      terugHref={`/groep/${params.id}`}
      groepNaam={groep.naam}
      naam={naam}
      van={van}
      tot={tot}
      verhalen={verhalen || []}
      tips={tips || []}
    />
  )
}
