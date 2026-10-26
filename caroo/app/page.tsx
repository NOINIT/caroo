import Link from 'next/link'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { TaalKiezer } from '@/components/TaalKiezer'
import { getT } from '@/lib/i18n/server'
import { JAARPRIJS } from '@/lib/i18n/vertaal'

export default async function HomePage() {
  const { t } = await getT()
  const usps = [
    { emoji: '🧠', tekst: t('home.usp1') },
    { emoji: '💊', tekst: t('home.usp2') },
    { emoji: '📅', tekst: t('home.usp3') },
    { emoji: '💡', tekst: t('home.usp4') },
    { emoji: '📸', tekst: t('home.usp5') },
  ]
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht via-white to-caroo-oranje-licht">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <CarooLogo size="lg" />
        <div className="flex items-center gap-3">
          <TaalKiezer variant="compact" />
          <Link href="/login" className="text-caroo-groen font-semibold text-sm hover:underline">
            {t('login.inloggen')}
          </Link>
        </div>
      </header>
      <main className="px-6 py-8 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-caroo-donker leading-tight mb-3">
            {t('home.kop1')}
            <br />
            <span className="text-caroo-groen">{t('home.kop2')}</span>
          </h1>
          <p className="text-gray-600">
            {t('home.intro')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {usps.map((usp, i) => (
            <span key={i} className="bg-white border border-caroo-groen text-caroo-donker text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
              {usp.emoji} {usp.tekst}
            </span>
          ))}
        </div>
        <div className="space-y-3 mb-8">
          <Link href="/registreer" className="btn-primary w-full text-center block">
            {t('home.gratisBeginnen')}
          </Link>
          <Link href="/login" className="btn-secondary w-full text-center block">
            {t('home.alAccount')}
          </Link>
        </div>
        <div className="caroo-card bg-caroo-groen text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80 mb-1">{t('home.voorGroep')}</p>
              <p className="text-xl font-bold">{t('aanmaken.perJaar', { prijs: JAARPRIJS })}</p>
            </div>
            <div className="text-3xl">💚</div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          {t('home.voet')}
        </p>
      </main>
    </div>
  )
}
