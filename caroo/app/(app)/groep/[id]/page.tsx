import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { uitloggen } from '@/app/auth/actions'

export default async function GroepPage({
  params
}: {
  params: { id: string }
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
    .select('id, naam, betaald, eigenaar_id')
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
  const isEigenaar = groep.eigenaar_id === user.id

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      {/* Header */}
      <header className="bg-caroo-groen text-white sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <Link href="/dashboard" className="text-white/70 text-xs">← Dashboard</Link>
            <h1 className="font-bold">{groep.naam}</h1>
          </div>
          <form action={uitloggen}>
            <button type="submit" className="text-white/70 text-sm">Uitloggen</button>
          </form>
        </div>
      </header>

      {/* Niet betaald banner */}
      {!groep.betaald && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <p className="text-orange-800 text-sm font-medium">
            ⚠️ Zorggroep nog niet geactiveerd —{' '}
            <Link href={`/betalen?groep=${groep.id}&naam=${encodeURIComponent(groep.naam)}`} className="underline">
              Nu activeren (€4,99)
            </Link>
          </p>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Snelkoppelingen */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: `/groep/${params.id}/agenda`, emoji: '📅', label: 'Agenda' },
            { href: `/groep/${params.id}/taken`, emoji: '✅', label: 'Taken' },
            { href: `/groep/${params.id}/medicijnen`, emoji: '💊', label: 'Medicijnen' },
            { href: `/groep/${params.id}/dagboek`, emoji: '📔', label: 'Dagboek' },
            { href: `/groep/${params.id}/fotos`, emoji: '📸', label: "Foto's" },
            { href: `/groep/${params.id}/beheer`, emoji: '⚙️', label: 'Beheer' },
          ].map(item => (
            <Link
              key={item.href}
              href={groep.betaald ? item.href : '#'}
              className={`caroo-card flex flex-col items-center justify-center py-4 text-center gap-1
                ${!groep.betaald ? 'opacity-50 cursor-not-allowed' : 'hover:border-caroo-groen transition-colors'}`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-medium text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Aankomende taken */}
        {openTaken && openTaken.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Open taken
            </h2>
            <div className="space-y-2">
              {openTaken.map((taak: any) => (
                <div key={taak.id} className="caroo-card flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{taak.titel}</p>
                    {taak.deadline && (
                      <p className="text-xs text-gray-400">
                        {new Date(taak.deadline).toLocaleDateString('nl-NL')}
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Komende afspraken
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
                    <p className="text-xs text-gray-400">
                      {new Date(afspraak.start_tijd).toLocaleDateString('nl-NL', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leden */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Groepsleden ({leden?.length || 0})
          </h2>
          <div className="space-y-2">
            {leden?.map((lid: any) => (
              <div key={lid.users.id} className="caroo-card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{lid.users.naam}</p>
                  <p className="text-xs text-gray-400">{lid.users.email}</p>
                </div>
                <span className="text-xs bg-caroo-groen-licht text-caroo-groen px-2 py-0.5 rounded-full">
                  {lid.rol}
                </span>
              </div>
            ))}
          </div>

          {(isBeheerder || isEigenaar) && groep.betaald && (
            <Link
              href={`/groep/${params.id}/uitnodigen`}
              className="mt-3 text-caroo-groen text-sm font-medium flex items-center gap-1 hover:underline"
            >
              ＋ Lid uitnodigen
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
