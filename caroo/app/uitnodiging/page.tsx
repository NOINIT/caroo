import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { valideerToken, accepteerUitnodiging } from '@/lib/uitnodiging'
import Link from 'next/link'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { OudereUitnodiging } from '@/components/uitnodiging/OudereUitnodiging'

const rolNamen = {
  mantelzorger: 'Mantelzorger',
  oudere: 'Oudere',
  groepsbeheerder: 'Groepsbeheerder',
}

export default async function UitnodigingPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token

  if (!token) {
    return <FoutPagina bericht="Geen uitnodigingstoken gevonden in de link." />
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
            titel="Je bent al lid van deze groep"
            bericht={`Je bent ingelogd als ${user.email}. Deze uitnodiging is voor iemand anders bedoeld en blijft gewoon geldig. Wil je hem zelf testen? Log dan eerst uit of open de link in een privévenster.`}
          />
        )
      }
      redirect(`/groep/${resultaat.groepId}?welkom=true`)
    }
    return <FoutPagina bericht={resultaat.error} />
  }

  const validatie = await valideerToken(token)

  if ('error' in validatie) {
    return <FoutPagina bericht={validatie.error ?? 'Onbekende fout'} />
  }

  const { uitnodiging } = validatie
  const groepNaam = (uitnodiging.zorggroepen as any)?.naam || 'Onbekende groep'

  // Oudere: geen wachtwoord, alleen een inloglink naar het adres van de uitnodiging
  if (uitnodiging.rol === 'oudere') {
    const [naamDeel, domein] = (uitnodiging.email || '').split('@')
    const gemaskeerd = domein ? `${naamDeel.slice(0, 1)}***@${domein}` : 'uw e-mailadres'
    return (
      <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
        <header className="px-6 pt-8 pb-4">
          <CarooLogo size="md" />
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
      <header className="px-6 pt-8 pb-4">
        <CarooLogo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="caroo-card text-center py-8">
            <div className="text-5xl mb-4">🤝</div>
            <h1 className="text-xl font-bold text-caroo-donker mb-2">
              Je bent uitgenodigd!
            </h1>
            <p className="text-gray-600 mb-1">
              Je hebt een uitnodiging ontvangen voor:
            </p>
            <p className="text-caroo-groen font-bold text-lg mb-1">{groepNaam}</p>
            <p className="text-sm text-gray-400 mb-6">
              Rol: {rolNamen[uitnodiging.rol as keyof typeof rolNamen]}
            </p>

            <div className="space-y-3">
              <Link
                href={`/login?redirect=/uitnodiging&token=${token}`}
                className="btn-primary w-full block text-center"
              >
                Inloggen en accepteren
              </Link>
              <Link
                href={`/registreer?redirect=/uitnodiging&token=${token}`}
                className="btn-secondary w-full block text-center"
              >
                Nieuw account aanmaken
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function FoutPagina({ bericht, titel = 'Uitnodiging ongeldig' }: { bericht: string; titel?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
      <header className="px-6 pt-8 pb-4">
        <CarooLogo size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="caroo-card text-center py-8 max-w-md w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-caroo-donker mb-2">
            {titel}
          </h1>
          <p className="text-gray-600 mb-6">{bericht}</p>
          <Link href="/" className="text-caroo-groen font-medium hover:underline text-sm">
            Ga naar de homepage
          </Link>
        </div>
      </main>
    </div>
  )
}
