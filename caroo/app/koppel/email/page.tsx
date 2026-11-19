import { getT } from '@/lib/i18n/server'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { leesKoppelEmailToken } from '@/lib/koppelen'
import { BevestigKnop } from './BevestigKnop'

// Het adres wordt pas gekoppeld na een tik op de knop, zodat een virusscanner de link niet opmaakt.
export default async function KoppelEmailPagina({ searchParams }: { searchParams: { t?: string } }) {
  const { t } = await getT()
  const token = searchParams.t || ''
  const geldig = leesKoppelEmailToken(token)
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col items-center justify-center px-6 py-10 text-center">
      <CarooLogo size="lg" />
      <div className="mt-10 max-w-lg w-full">
        <h1 className="text-3xl font-bold text-caroo-donker">{t('koppelEmail.paginaTitel')}</h1>
        {geldig ? (
          <>
            <p className="text-ou-lg text-gray-700 mt-4">{t('koppelEmail.paginaTekst', { email: geldig.email })}</p>
            <BevestigKnop token={token} />
          </>
        ) : (
          <p className="text-ou-lg text-gray-700 mt-4">{t('koppelEmail.verlopen')}</p>
        )}
      </div>
    </div>
  )
}
