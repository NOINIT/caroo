import Link from 'next/link'
import { CarooLogo } from '@/components/ui/CarooLogo'

const usps = [
  { emoji: '🧠', tekst: 'Mijn verhaal — herinneringen met spraak' },
  { emoji: '💊', tekst: 'Medicijnenagenda voor de hele groep' },
  { emoji: '📅', tekst: 'Kleurenagenda met eigen categorieën' },
  { emoji: '💡', tekst: 'Tips van opa/oma doorgeven' },
  { emoji: '📸', tekst: 'Fotoalbum voor bijzondere momenten' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht via-white to-caroo-oranje-licht">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <CarooLogo size="lg" />
        <Link
          href="/login"
          className="text-caroo-groen font-semibold text-sm hover:underline"
        >
          Inloggen
        </Link>
      </header>

      {/* Hero */}
      <main className="px-6 py-8 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-caroo-donker leading-tight mb-3">
            Zorg voor elkaar,
            <br />
            <span className="text-caroo-groen">samen georganiseerd</span>
          </h1>
          <p className="text-gray-600">
            Caroo brengt mantelzorgers en ouderen samen in één veilige app.
            Eenmalig €4,99 voor de hele zorggroep.
          </p>
        </div>

        {/* USP chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {usps.map((usp, i) => (
            <span
              key={i}
              className="bg-white border border-caroo-groen text-caroo-donker text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
            >
              {usp.emoji} {usp.tekst}
            </span>
          ))}
        </div>

        {/* CTA knoppen */}
        <div className="space-y-3 mb-8">
          <Link href="/registreer" className="btn-primary w-full text-center block">
            Gratis beginnen
          </Link>
          <Link href="/login" className="btn-secondary w-full text-center block">
            Ik heb al een account
          </Link>
        </div>

        {/* Prijs vergelijking */}
        <div className="caroo-card bg-caroo-groen text-white mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-80">
            Vergelijk
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm line-through opacity-60">Concurrenten: $300/jaar</p>
              <p className="text-xl font-bold">Caroo: €4,99 eenmalig</p>
            </div>
            <div className="text-3xl">💚</div>
          </div>
        </div>

        {/* Vertrouwen */}
        <p className="text-center text-xs text-gray-400">
          🔒 AVG-conform · Servers in Europa · NOINIT
        </p>
      </main>
    </div>
  )
}
