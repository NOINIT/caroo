import { bekijkKoppelcode } from '@/lib/koppelen'
import { getT } from '@/lib/i18n/server'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { StartKnop } from './StartKnop'

// De code zelf wordt pas gebruikt als iemand op Start tikt,
// zodat een voorbeeldweergave (bijv. in WhatsApp) hem niet opmaakt.
export default async function KoppelPagina({ params }: { params: { code: string } }) {
  const { t } = await getT()
  const gevonden = await bekijkKoppelcode(params.code)
  return (
    <div className="min-h-screen bg-gradient-to-br from-caroo-groen-licht to-white flex flex-col items-center justify-center px-6 py-10 text-center">
      <CarooLogo size="lg" />
      {gevonden ? (
        <div className="mt-10 max-w-lg">
          <h1 className="text-4xl md:text-5xl font-bold text-caroo-donker">{t('koppelen.welkomTitel', { naam: gevonden.naam.split(' ')[0] })}</h1>
          <p className="text-ou-lg md:text-ou-xl text-gray-700 mt-4">{t('koppelen.welkomTekst')}</p>
          <StartKnop code={params.code} />
        </div>
      ) : (
        <div className="mt-10 max-w-lg">
          <h1 className="text-3xl font-bold text-caroo-donker">{t('koppelen.ongeldigTitel')}</h1>
          <p className="text-ou-lg text-gray-700 mt-4">{t('koppelen.ongeldigTekst')}</p>
        </div>
      )}
    </div>
  )
}
