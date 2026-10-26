import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { valideerToken, accepteerUitnodiging } from '@/lib/uitnodiging'
import Link from 'next/link'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { OudereUitnodiging } from '@/components/uitnodiging/OudereUitnodiging'
import { TaalKiezer } from '@/components/TaalKiezer'
import { getT } from '@/lib/i18n/server'
import type { TFunctie } from '@/lib/i18n/vertaal'

export default async function UitnodigingPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token
  const { t } = await getT()

  if (!token) {
    return <FoutPagina t={t} bericht={t('uitnodiging.geenToken')} />
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Al ingelogd: direct accepteren en doorsturen
  if (user) {
    const resultaat = await accepteerUitnodiging(token, user.id)
    if ('groepId' in resultaat) {
      if (resultaat.alLid) {
        // Deze uitnodiging is voor iemand anders: niet verbruiken, wel uitleggen
        return (
          <FoutPagina
            t={t}
            titel={t('uitnodiging.alLidTitel')}
            bericht={t('uitnodiging.alLidTekst', { email: user.email || '' })}
          />
        )
      }
      redirect(`/groep/${resultaat.groepId}?welkom=true`)
    }
    return <FoutPagina t={t} bericht={resultaat.error} />
  }

  const validatie = await valideerToken(token)

  if ('error' in validatie) {
    return <FoutPagina t={t} bericht={validatie.error ?? t('uitnodiging.onbekendeFout')} />
  }

  const { uitnodiging } = validatie
  const groepNaam = (uitnodiging.zorggroepen as any)?.naam || t('uitnodiging.onbekendeGroep')

  // Oudere: geen wachtwoord, alleen een inloglink naar het adres van de uitnodiging
  if (uitnodiging.rol === 'oudere') {
    const [naamDeel, domein] = (uitnodiging.email || '').split('@')
    const gemaskeerd = domein ? `${naamDeel.slice(0, 1)}***@${domein}` : t('uitnodiging.uwEmail')
    return (
      <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
        <header className="px-6 pt-8 pb-4 flex items-center justify-between gap-3">
          <CarooLogo size="md" />
          <TaalKiezer variant="compact" />
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-md">
            <OudereUitnodiging token={token} groepNaam={groepNaam} gemaskeerdEmail={gemaskeerd} />
          </div>
        </main>
      </div>
    )
  }

  // Niet ingelogd: toon uitnodigingspagina met login/registreer opties
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between gap-3">
        <CarooLogo size="md" />
        <TaalKiezer variant="compact" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="caroo-card text-center py-8">
            <div className="text-5xl mb-4">🤝</div>
            <h1 className="text-xl font-bold text-caroo-donker mb-2">
              {t('uitnodiging.titel')}
            </h1>
            <p className="text-gray-600 mb-1">
              {t('uitnodiging.ontvangenVoor')}
            </p>
            <p className="text-caroo-groen font-bold text-lg mb-1">{groepNaam}</p>
            <p className="text-sm text-gray-400 mb-6">
              {t('uitnodiging.rol', { rol: t(`rollen.${uitnodiging.rol as 'oudere' | 'mantelzorger' | 'groepsbeheerder'}`) })}
            </p>

            <div className="space-y-3">
              <Link
                href={`/login?redirect=/uitnodiging&token=${token}`}
                className="btn-primary w-full block text-center"
              >
                {t('uitnodiging.inloggenAccepteren')}
              </Link>
              <Link
                href={`/registreer?redirect=/uitnodiging&token=${token}`}
                className="btn-secondary w-full block text-center"
              >
                {t('uitnodiging.nieuwAccount')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function FoutPagina({ t, bericht, titel }: { t: TFunctie; bericht: string; titel?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between gap-3">
        <CarooLogo size="md" />
        <TaalKiezer variant="compact" />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="caroo-card text-center py-8 max-w-md w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-caroo-donker mb-2">
            {titel ?? t('uitnodiging.ongeldigTitel')}
          </h1>
          <p className="text-gray-600 mb-6">{bericht}</p>
          <Link href="/" className="text-caroo-groen font-medium hover:underline text-sm">
            {t('algemeen.naarHome')}
          </Link>
        </div>
      </main>
    </div>
  )
}
