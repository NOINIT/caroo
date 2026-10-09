import { CarooLogo } from '@/components/ui/CarooLogo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col">
      <header className="px-6 pt-8 pb-4">
        <CarooLogo size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      <footer className="text-center text-xs text-gray-400 py-4">
        © 2024 NOINIT · Caroo
      </footer>
    </div>
  )
}
