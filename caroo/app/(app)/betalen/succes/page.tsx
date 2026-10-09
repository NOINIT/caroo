import Link from 'next/link'

export default function BetalingSuccesPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-caroo-donker mb-2">
        Betaling geslaagd!
      </h1>
      <p className="text-gray-600 mb-6">
        Jouw zorggroep is geactiveerd. Je kunt nu mensen uitnodigen en alles instellen.
      </p>

      <div className="caroo-card bg-caroo-groen-licht mb-6 text-left">
        <h2 className="font-semibold text-caroo-donker mb-3">Volgende stappen:</h2>
        <ol className="text-sm text-gray-700 space-y-2">
          <li>1️⃣ Nodig familieleden uit als mantelzorger</li>
          <li>2️⃣ Stuur een uitnodigingslink naar de oudere (magic link)</li>
          <li>3️⃣ Voeg medicijnen toe aan de agenda</li>
          <li>4️⃣ Plan de eerste afspraken in de kleurenagenda</li>
        </ol>
      </div>

      <Link href="/dashboard" className="btn-primary w-full block text-center">
        Naar mijn dashboard →
      </Link>
    </div>
  )
}
