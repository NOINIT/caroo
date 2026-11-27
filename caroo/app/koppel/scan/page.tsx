import { QrScanner } from './QrScanner'
import { CarooLogo } from '@/components/ui/CarooLogo'

export default function KoppelScanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
      <header className="px-6 pt-8 pb-4">
        <CarooLogo size="md" />
      </header>
      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          <QrScanner />
        </div>
      </main>
    </div>
  )
}
