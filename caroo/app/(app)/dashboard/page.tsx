import { createClient } from '@/lib/supabase/server'
import { getMijnGroepen } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { uitloggen } from '@/app/auth/actions'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { welkom?: string; groep?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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

  const heeftGeenGroepen = groepen.length === 0
  const welkomTerug = searchParams.welkom === 'true'

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <CarooLogo size="sm" />
          <form action={uitloggen}>
            <button type="submit" className="text-sm text-gray-500 hover:text-red-500 transition-colors">
              Uitloggen
            </button>
          </form>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Welkomstbericht */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-caroo-donker">
            Hallo, {profiel?.naam?.split(' ')[0] || 'daar'} 👋
          </h1>
          {welkomTerug && (
            <p className="text-caroo-groen text-sm mt-1">
              Welkom in jouw zorggroep! Je kunt nu beginnen.
            </p>
          )}
        </div>

        {/* Geen groepen — call to action */}
        {heeftGeenGroepen && (
          <div className="caroo-card bg-caroo-groen-licht border-caroo-groen border mb-6">
            <h2 className="font-bold text-caroo-donker mb-2">Maak je eerste zorggroep aan</h2>
            <p className="text-sm text-gray-600 mb-4">
              Nodig familie en mantelzorgers uit. Eenmalig €4,99 voor de hele groep.
            </p>
            <Link href="/groep/aanmaken" className="btn-primary text-sm">
              Zorggroep aanmaken →
            </Link>
          </div>
        )}

        {/* Zorggroepen */}
        {groepen.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Mijn zorggroepen
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
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lid.rol === 'groepsbeheerder' ? '👑 Beheerder' :
                         lid.rol === 'mantelzorger' ? '🤝 Mantelzorger' : '👴 Oudere'}
                        {!groep.betaald && (
                          <span className="ml-2 text-orange-500">⚠️ Niet betaald</span>
                        )}
                      </p>
                    </div>
                    <span className="text-caroo-groen">→</span>
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
            ＋ Nieuwe zorggroep aanmaken
          </Link>
        )}
      </div>
    </div>
  )
}
