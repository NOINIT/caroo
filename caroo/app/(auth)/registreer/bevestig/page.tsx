import Link from 'next/link'

export default function BevestigPage() {
  return (
    <div className="caroo-card text-center py-8">
      <div className="text-5xl mb-4">📧</div>
      <h1 className="text-xl font-bold text-caroo-donker mb-2">
        Controleer je e-mail
      </h1>
      <p className="text-gray-600 mb-4">
        We hebben een bevestigingslink gestuurd naar jouw e-mailadres.
        Klik op de link om je account te activeren.
      </p>
      <p className="text-sm text-gray-400 mb-6">
        Geen e-mail ontvangen? Check ook je spamfolder.
      </p>
      <Link href="/login" className="text-caroo-groen text-sm font-medium hover:underline">
        Terug naar inloggen
      </Link>
    </div>
  )
}
