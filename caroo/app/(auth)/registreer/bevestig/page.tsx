import Link from 'next/link'
import { getT } from '@/lib/i18n/server'

export default async function BevestigPage() {
  const { t } = await getT()
  return (
    <div className="caroo-card text-center py-8">
      <div className="text-5xl mb-4">📧</div>
      <h1 className="text-xl font-bold text-caroo-donker mb-2">
        {t('registreer.controleerMail')}
      </h1>
      <p className="text-gray-600 mb-4">
        {t('registreer.bevestigingGestuurd')}
      </p>
      <p className="text-sm text-gray-600 mb-6">
        {t('login.geenMail')}
      </p>
      <Link href="/login" className="text-caroo-groen text-sm font-medium hover:underline">
        {t('registreer.terugInloggen')}
      </Link>
    </div>
  )
}
