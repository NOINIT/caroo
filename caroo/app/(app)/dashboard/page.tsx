import { createClient } from '@/lib/supabase/server'
import { getMijnGroepen } from '@/lib/rechten'
import { verwerkOpenUitnodigingen } from '@/lib/uitnodiging'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { uitloggen } from '@/app/auth/actions'
import { getT } from '@/lib/i18n/server'
import { toegangVan } from '@/lib/opzeggen'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { welkom?: string; groep?: string; uitnodiging?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Vangnet: openstaande uitnodigingen alsnog verwerken (bijv. na inloggen
  // in een andere browser dan waar de bevestigingsmail werd geopend)
  const nieuweGroep = await verwerkOpenUitnodigingen(user)
  if (nieuweGroep) redirect(`/groep/${nieuweGroep}?welkom=true`)

  // Haal gebruikersprofiel op
  const { data: profiel } = await supabase
    .from('users')
    .select('naam, rol')
    .eq('id', user.id)
    .single()

  // Haal zorggroepen op
  const groepen = await getMijnGroepen()

  // Als de user maar één groep heeft en de rol "oudere" is, direct naar oudereninterface
  if (groepen.length === 1) {
    const groepData = groepen[0] as any
    if (groepData.rol === 'oudere') {
      redirect(`/oudere/${groepData.zorggroepen.id}`)
    }
  }

  const { t } = await getT()
  const heeftGeenGroepen = groepen.length === 0
  const welkomTerug = searchParams.welkom === 'true'
  const uitnodigingOngeldig = searchParams.uitnodiging === 'ongeldig'

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <CarooLogo size="sm" />
          <div className="flex items-center gap-4">
            <Link href="/instellingen" className="text-lg" aria-label={t('algemeen.instellingen')}>⚙️</Link>
            <form action={uitloggen}>
              <button type="submit" className="text-sm text-gray-600 hover:text-red-500 transition-colors">
                {t('algemeen.uitloggen')}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Welkomstbericht */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-caroo-donker">
            {t('dashboard.hallo', { naam: profiel?.naam?.split(' ')[0] || t('dashboard.daar') })}
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">{t('instellingen.ingelogdAls', { email: user.email || '' })}</p>
          {welkomTerug && (
            <p className="text-caroo-groen text-sm mt-1">
              {t('dashboard.welkom')}
            </p>
          )}
          {uitnodigingOngeldig && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-caroo p-3 mt-3 text-sm">
              {t('dashboard.uitnodigingOngeldig')}
            </div>
          )}
        </div>

        {/* Geen groepen — call to action */}
        {heeftGeenGroepen && (
          <div className="caroo-card bg-caroo-groen-licht border-caroo-groen border mb-6">
            <h2 className="font-bold text-caroo-donker mb-2">{t('dashboard.eersteGroep')}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {t('dashboard.eersteGroepUitleg')}
            </p>
            <Link href="/groep/aanmaken" className="btn-primary text-sm">
              {t('dashboard.groepAanmaken')} <span className="inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
        )}

        {/* Zorggroepen */}
        {groepen.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              {t('dashboard.mijnGroepen')}
            </h2>
            <div className="space-y-3">
              {groepen.map((lid: any) => {
                const groep = lid.zorggroepen
                return (
                  <Link
                    key={groep.id}
                    href={`/groep/${groep.id}`}
                    className="caroo-card flex items-center justify-between hover:border-caroo-groen transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-caroo-donker">{groep.naam}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {lid.rol === 'groepsbeheerder' ? `👑 ${t('dashboard.beheerder')}` :
                         lid.rol === 'mantelzorger' ? `🤝 ${t('rollen.mantelzorger')}` : `⭐ ${t('rollen.oudere')}`}
                        {toegangVan(groep).toegang === 'proef' && (
                          <span className="ms-2 text-caroo-groen">{t('dashboard.gratisMaand')}</span>
                        )}
                        {toegangVan(groep).toegang === 'geen' && (
                          <span className="ms-2 text-caroo-oranje-tekst">{t('dashboard.nietBetaald')}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-caroo-groen rtl:rotate-180">→</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Nieuwe groep toevoegen */}
        {groepen.length > 0 && (
          <Link
            href="/groep/aanmaken"
            className="text-caroo-groen text-sm font-medium flex items-center gap-1 hover:underline"
          >
            {t('dashboard.nieuweGroep')}
          </Link>
        )}
      </div>
    </div>
  )
}
