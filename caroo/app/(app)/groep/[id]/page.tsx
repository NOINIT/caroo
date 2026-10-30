import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getT } from '@/lib/i18n/server'
import { rolTekst, datum, tijd } from '@/lib/i18n/vertaal'
import { uitloggen } from '@/app/auth/actions'
import AbonnementKnop from './AbonnementKnop'
import { FamilieSignalen } from '@/components/familie/FamilieSignalen'
import { vandaagNL, BEZOEK_GELDIG_UUR } from '@/lib/stemming'
import { toegangVan } from '@/lib/opzeggen'
import { samenAfsprakenVanGroep, vakerBezoekGevraagd, vriendVerzoekenVanGroep } from '@/lib/vrienden'
import { VriendVerzoeken } from '@/components/familie/VriendVerzoeken'
import { SamenAfspraken } from '@/components/familie/SamenAfspraken'

export default async function GroepPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { welkom?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Controleer toegang
  const heeftToegang = await heeftRecht(params.id, ['mantelzorger', 'groepsbeheerder', 'oudere'])
  if (!heeftToegang) redirect('/dashboard')

  // Haal groepinfo op
  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald, eigenaar_id, gestopt_op, aangemaakt_op')
    .eq('id', params.id)
    .single()

  if (!groep) redirect('/dashboard')

  // Haal lid info op voor de huidige gebruiker
  const { data: mijnLidschap } = await supabase
    .from('groepsleden')
    .select('rol')
    .eq('groep_id', params.id)
    .eq('user_id', user.id)
    .single()

  // Als oudere: redirect naar oudereninterface
  if (mijnLidschap?.rol === 'oudere') {
    redirect(`/oudere/${params.id}`)
  }

  // Haal leden op
  const { data: leden } = await supabase
    .from('groepsleden')
    .select(`
      rol,
      toegevoegd_op,
      users (id, naam, email)
    `)
    .eq('groep_id', params.id)

  // Stemming van vandaag en openstaande bezoekverzoeken
  const [{ data: stemmingenVandaag }, { data: bezoekverzoeken }, { data: mijnProfiel }] = await Promise.all([
    supabase
      .from('stemmingen')
      .select('naam, stemming, bijgewerkt_op')
      .eq('groep_id', params.id)
      .eq('datum', vandaagNL()),
    supabase
      .from('bezoekverzoeken')
      .select('id, aangevraagd_naam, aangemaakt_op, reactie_naam, reactie_wanneer, soort')
      .eq('groep_id', params.id)
      .gt('aangemaakt_op', new Date(Date.now() - BEZOEK_GELDIG_UUR * 3600 * 1000).toISOString())
      .order('aangemaakt_op', { ascending: false }),
    supabase.from('users').select('naam').eq('id', user.id).single(),
  ])

  // Tips en levenslessen van de hoofdpersoon (en anderen)
  const { data: tips } = await supabase
    .from('tips')
    .select('id, tekst, aangemaakt_op, auteur_naam, users (naam)')
    .eq('groep_id', params.id)
    .order('aangemaakt_op', { ascending: false })
    .limit(5)

  // Haal aankomende taken op
  const { data: openTaken } = await supabase
    .from('taken')
    .select('id, titel, deadline, voltooid')
    .eq('groep_id', params.id)
    .eq('voltooid', false)
    .order('deadline', { ascending: true })
    .limit(5)

  // Haal aankomende afspraken op
  const { data: afspraken } = await supabase
    .from('afspraken')
    .select(`
      id, titel, start_tijd,
      agenda_categorieen (naam, kleur)
    `)
    .eq('groep_id', params.id)
    .gte('start_tijd', new Date().toISOString())
    .order('start_tijd', { ascending: true })
    .limit(3)

  const isBeheerder = mijnLidschap?.rol === 'groepsbeheerder'
  const [samen, signaal, vriendVerzoeken] = await Promise.all([
    samenAfsprakenVanGroep(params.id).catch(() => []),
    isBeheerder ? vakerBezoekGevraagd(params.id).catch(() => null) : Promise.resolve(null),
    vriendVerzoekenVanGroep(params.id).catch(() => []),
  ])
  const isEigenaar = groep.eigenaar_id === user.id
  const welkom = searchParams.welkom === 'true'
  const { t, taal } = await getT()
  const nazorg = toegangVan(groep)

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      {/* Header */}
      <header className="bg-caroo-groen text-white sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <Link href="/dashboard" className="text-white text-xs"><span className="inline-block rtl:rotate-180">←</span> {t('groep.dashboard')}</Link>
            <h1 className="font-bold">{groep.naam}</h1>
          </div>
          <div className="text-end">
            <div className="flex items-center justify-end gap-3">
              <Link href="/instellingen" className="text-white text-lg" aria-label={t('algemeen.instellingen')}>⚙️</Link>
              <form action={uitloggen}>
                <button type="submit" className="text-white text-sm">{t('algemeen.uitloggen')}</button>
              </form>
            </div>
            <p className="text-white text-xs max-w-[180px] truncate" dir="ltr">{user.email}</p>
          </div>
        </div>
      </header>

      {/* Welkomstbanner na het accepteren van een uitnodiging */}
      {welkom && (
        <div className="bg-caroo-groen-licht border-b border-caroo-groen px-4 py-3">
          <p className="text-caroo-donker text-sm font-medium">
            {t('groep.welkom', { groep: groep.naam })}
          </p>
        </div>
      )}

      {/* Abonnement gestopt: nog even de verhalen downloaden */}
      {nazorg.toegang === 'nazorg' && nazorg.tot && (
        <div className="bg-caroo-oranje-licht border-b border-caroo-oranje px-4 py-3">
          <p className="text-caroo-donker text-sm font-medium">
            {t('boekje.gestopt', { datum: datum(taal, nazorg.tot, { day: 'numeric', month: 'long', year: 'numeric' }) })}{' '}
            <Link href={`/groep/${groep.id}/boekje`} className="underline">{t('boekje.knop')}</Link>
          </p>
        </div>
      )}

      {/* Gratis maand loopt nog */}
      {nazorg.toegang === 'proef' && nazorg.tot && (
        <div className="bg-caroo-groen-licht border-b border-caroo-groen px-4 py-3">
          <p className="text-caroo-donker text-sm font-medium">
            {t('groep.proefLoopt', { datum: datum(taal, nazorg.tot, { day: 'numeric', month: 'long' }) })}{' '}
            {isEigenaar && (
              <Link href={`/betalen?groep=${groep.id}&naam=${encodeURIComponent(groep.naam)}`} className="underline">
                {t('groep.kiesAbonnement')}
              </Link>
            )}
          </p>
        </div>
      )}

      {/* Gratis maand voorbij, geen abonnement */}
      {nazorg.toegang === 'geen' && (
        <div className="bg-caroo-oranje-licht border-b border-caroo-oranje px-4 py-3">
          <p className="text-caroo-donker text-sm font-medium">
            {isEigenaar ? t('groep.proefVoorbij') : t('groep.proefVoorbijLid')}{' '}
            {isEigenaar && (
              <Link href={`/betalen?groep=${groep.id}&naam=${encodeURIComponent(groep.naam)}`} className="underline">
                {t('groep.kiesAbonnement')}
              </Link>
            )}
          </p>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        <FamilieSignalen
          mijnNaam={mijnProfiel?.naam || t('algemeen.iemand')}
          mijnId={user.id}
          stemmingen={stemmingenVandaag || []}
          verzoeken={bezoekverzoeken || []}
        />

        {/* Zacht signaal, alleen voor de beheerder */}
        {signaal && (
          <div className="caroo-card border-s-4 border-caroo-oranje">
            <p className="text-sm text-caroo-donker">{t('vrienden.familie.signaal', { naam: (signaal.naam || t('algemeen.deHoofdpersoon')).split(' ')[0] })}</p>
            <Link href={`/groep/${params.id}/hulp`} className="text-sm text-caroo-groen font-medium hover:underline">{t('vrienden.familie.signaalLink')}</Link>
          </div>
        )}

        <VriendVerzoeken groepId={params.id} mijnId={user.id} verzoeken={vriendVerzoeken} />

        <SamenAfspraken groepId={params.id} afspraken={samen} />

        {/* Snelkoppelingen */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: `/groep/${params.id}/agenda`, emoji: '📅', label: t('groep.tegels.agenda') },
            { href: `/groep/${params.id}/taken`, emoji: '✅', label: t('groep.tegels.taken') },
            { href: `/groep/${params.id}/boodschappen`, emoji: '🛒', label: t('groep.tegels.boodschappen') },
            { href: `/groep/${params.id}/medicijnen`, emoji: '💊', label: t('groep.tegels.medicijnen') },
            { href: `/groep/${params.id}/dagboek`, emoji: '📔', label: t('groep.tegels.dagboek') },
            { href: `/groep/${params.id}/fotos`, emoji: '📸', label: t('groep.tegels.fotos') },
            { href: `/groep/${params.id}/boekje`, emoji: '📖', label: t('groep.tegels.verhalen'), altijd: true },
            ...(isBeheerder
              ? [{ href: `/groep/${params.id}/beheer`, emoji: '⚙️', label: t('groep.tegels.beheer') }]
              : []),
          ].map((item: { href: string; emoji: string; label: string; altijd?: boolean }) => {
            const open = nazorg.toegang === 'actief' || nazorg.toegang === 'proef' || (item.altijd && nazorg.toegang === 'nazorg')
            return (
            <Link
              key={item.href}
              href={open ? item.href : '#'}
              className={`caroo-card flex flex-col items-center justify-center py-4 text-center gap-1
                ${!open ? 'opacity-50 cursor-not-allowed' : 'hover:border-caroo-groen transition-colors'}`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-medium text-gray-700">{item.label}</span>
            </Link>
            )
          })}
        </div>

        {/* Tips en levenslessen */}
        {tips && tips.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {t('groep.tips')}
            </h2>
            <div className="space-y-2">
              {tips.map((tip: any) => (
                <div key={tip.id} className="caroo-card border-s-4 border-caroo-oranje">
                  <p className="text-caroo-donker whitespace-pre-line">💡 {tip.tekst}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {tip.users?.naam || tip.auteur_naam || t('algemeen.onbekend')} ·{' '}
                    {datum(taal, tip.aangemaakt_op, { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aankomende taken */}
        {openTaken && openTaken.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {t('groep.openTaken')}
            </h2>
            <div className="space-y-2">
              {openTaken.map((taak: any) => (
                <div key={taak.id} className="caroo-card flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{taak.titel}</p>
                    {taak.deadline && (
                      <p className="text-xs text-gray-600">
                        {datum(taal, taak.deadline, { day: 'numeric', month: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aankomende afspraken */}
        {afspraken && afspraken.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {t('groep.komendeAfspraken')}
            </h2>
            <div className="space-y-2">
              {afspraken.map((afspraak: any) => (
                <div key={afspraak.id} className="caroo-card flex items-center gap-3">
                  <div
                    className="w-3 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: afspraak.agenda_categorieen?.kleur || '#1A7A6E' }}
                  />
                  <div>
                    <p className="text-sm font-medium">{afspraak.titel}</p>
                    <p className="text-xs text-gray-600">
                      {datum(taal, afspraak.start_tijd, { weekday: 'short', day: 'numeric', month: 'short' })} · {tijd(taal, afspraak.start_tijd)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leden */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            {t('groep.leden', { aantal: leden?.length || 0 })}
          </h2>
          <div className="space-y-2">
            {leden?.map((lid: any) => (
              <div key={lid.users.id} className="caroo-card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{lid.users.naam}</p>
                  <p className="text-xs text-gray-600" dir="ltr">{lid.users.email}</p>
                </div>
                <span className="text-xs bg-caroo-groen-licht text-caroo-groen px-2 py-0.5 rounded-full">
                  {rolTekst(t, lid.rol)}
                </span>
              </div>
            ))}
          </div>

          {(isBeheerder || mijnLidschap?.rol === 'mantelzorger') && (nazorg.toegang === 'actief' || nazorg.toegang === 'proef') && (
            <Link
              href={`/groep/${params.id}/koppelen`}
              className="mt-3 text-caroo-groen text-sm font-medium flex items-center gap-1 hover:underline"
            >
              {t('koppelen.koppelLink')}
            </Link>
          )}

          {(isBeheerder || mijnLidschap?.rol === 'mantelzorger') && (nazorg.toegang === 'actief' || nazorg.toegang === 'proef') && (
            <Link
              href={`/groep/${params.id}/vrienden`}
              className="mt-3 text-caroo-groen text-sm font-medium flex items-center gap-1 hover:underline"
            >
              {t('vrienden.familie.link')}
            </Link>
          )}

          {(isBeheerder || mijnLidschap?.rol === 'mantelzorger') && (
            <Link
              href={`/groep/${params.id}/hulp`}
              className="mt-3 text-caroo-groen text-sm font-medium flex items-center gap-1 hover:underline"
            >
              🤝 {t('hulp.titel')}
            </Link>
          )}

          {isBeheerder && (nazorg.toegang === 'actief' || nazorg.toegang === 'proef') && (
            <Link
              href={`/groep/${params.id}/uitnodigen`}
              className="mt-3 text-caroo-groen text-sm font-medium flex items-center gap-1 hover:underline"
            >
              {t('groep.lidUitnodigen')}
            </Link>
          )}

          {isEigenaar && groep.betaald && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <AbonnementKnop groepId={params.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
