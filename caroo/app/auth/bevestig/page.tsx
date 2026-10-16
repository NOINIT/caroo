import { BevestigKnop } from './BevestigKnop'
import { CarooLogo } from '@/components/ui/CarooLogo'

export default function BevestigPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; type?: string; next?: string }
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
      <header className="px-6 pt-8 pb-4">
        <CarooLogo size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md caroo-card text-center py-8 px-5">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-ou-xl font-bold text-caroo-donker mb-3">Bijna binnen</h1>
          <p className="text-ou-base text-gray-600 mb-6">Tik op de knop om verder te gaan.</p>
          <BevestigKnop
            tokenHash={searchParams.token_hash || ''}
            type={searchParams.type || ''}
            next={searchParams.next || '/dashboard'}
          />
        </div>
      </main>
    </div>
  )
}
