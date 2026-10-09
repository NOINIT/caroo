import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { valideerToken, accepteerUitnodiging } from '@/lib/uitnodiging'
import Link from 'next/link'
import { CarooLogo } from '@/components/ui/CarooLogo'

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

  const tokenStr = token

  const validatie = await valideerToken(tokenStr)

  if ('error' in validatie) {
    return <FoutPagina bericht={validatie.error ?? 'Onbekende fout'} />
  }

  const { uitnodiging } = validatie
  const groepNaam = (uitnodiging.zorggroepen as any)?.naam || 'Onbekende groep'

  // Controleer of de gebruiker al is ingelogd
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Accepteer automatisch als de gebruiker al is ingelogd
    const resultaat = await accepteerUitnodiging(tokenStr, user.id)
    if ('error' in resultaat) {
      return <FoutPagina bericht={resultaat.error ?? 'Onbekende fout'} />
    }
    const groepId = 'groepId' in resultaat ? resultaat.groepId : ''
    redirect(`/dashboard?groep=${groepId}&welkom=true`)
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

function FoutPagina({ bericht }: { bericht: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
      <header className="px-6 pt-8 pb-4">
        <CarooLogo size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="caroo-card text-center py-8 max-w-md w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-caroo-donker mb-2">
            Uitnodiging ongeldig
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
