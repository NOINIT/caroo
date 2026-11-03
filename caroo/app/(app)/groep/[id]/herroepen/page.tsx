import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'
import { datum } from '@/lib/i18n/vertaal'
import { laadHerroepInfo } from '@/lib/herroepen-server'
import { HerroepFormulier } from './HerroepFormulier'

export const dynamic = 'force-dynamic'

// Herroepingsfunctie (EU-richtlijn 2023/2673): 14 dagen na het afsluiten van een abonnement.
export default async function HerroepenPagina({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { t, taal } = await getT()

  const info = await laadHerroepInfo(params.id, user.id)
  const { data: profiel } = await supabase.from('users').select('naam').eq('id', user.id).maybeSingle()
  const lang = { day: 'numeric', month: 'long', year: 'numeric' } as const

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <Link href={`/groep/${params.id}`} className="text-sm text-caroo-groen underline">
        <span className="inline-block rtl:rotate-180">←</span> {t('herroepen.terug')}
      </Link>
      <h1 className="text-2xl font-bold text-caroo-donker">{t('herroepen.titel')}</h1>
      {info === 'verlopen' || !info ? (
        <p className="caroo-card text-gray-700">{info === 'verlopen' ? t('herroepen.verlopen') : t('herroepen.mislukt')}</p>
      ) : (
        <>
          <p className="text-gray-700">{t('herroepen.uitleg')}</p>
          <p className="text-gray-700 font-medium">{t('herroepen.tot', { datum: datum(taal, new Date(info.tot.getTime() - 1), lang) })}</p>
          <HerroepFormulier
            groepId={params.id}
            naam={profiel?.naam || ''}
            email={user.email || ''}
            overeenkomst={t('herroepen.overeenkomstTekst', { groep: info.groepNaam, datum: datum(taal, info.sinds, lang) })}
          />
        </>
      )}
    </div>
  )
}
