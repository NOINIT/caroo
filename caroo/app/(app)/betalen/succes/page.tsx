import Link from 'next/link'
import { getT } from '@/lib/i18n/server'

export default async function BetalingSuccesPage() {
  const { t } = await getT()
  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-caroo-donker mb-2">
        {t('succes.titel')}
      </h1>
      <p className="text-gray-600 mb-6">
        {t('succes.tekst')}
      </p>

      <div className="caroo-card bg-caroo-groen-licht mb-6 text-start">
        <h2 className="font-semibold text-caroo-donker mb-3">{t('succes.stappen')}</h2>
        <ol className="text-sm text-gray-700 space-y-2">
          <li>{t('succes.stap1')}</li>
          <li>{t('succes.stap2')}</li>
          <li>{t('succes.stap3')}</li>
          <li>{t('succes.stap4')}</li>
        </ol>
      </div>

      <Link href="/dashboard" className="btn-primary w-full block text-center">
        {t('succes.naarDashboard')}
      </Link>
    </div>
  )
}
