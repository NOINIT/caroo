import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { getT } from '@/lib/i18n/server'

const LINK = 'text-caroo-groen font-medium underline'

export default async function HulpPage({ params }: { params: { id: string } }) {
  if (!(await heeftRecht(params.id, ['groepsbeheerder', 'mantelzorger']))) redirect(`/groep/${params.id}`)
  const { t } = await getT()
  const supabase = createClient()
  const { data: hoofd } = await supabase.from('groepsleden').select('users (naam)').eq('groep_id', params.id).eq('rol', 'oudere').limit(1).maybeSingle()
  const naam = ((hoofd as any)?.users?.naam as string | undefined)?.split(' ')[0] || t('algemeen.deHoofdpersoon')

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <Link href={`/groep/${params.id}`} className="text-sm text-caroo-groen hover:underline">
        <span className="inline-block rtl:rotate-180">←</span> {t('hulp.terug')}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">{t('hulp.titel')}</h1>
        <p className="text-gray-700">{t('hulp.intro', { naam })}</p>
      </div>

      <section className="caroo-card space-y-3">
        <h2 className="font-bold text-caroo-donker">{t('hulp.ideeenTitel')}</h2>
        <p className="text-gray-700">📞 {t('hulp.idee1')}</p>
        <p className="text-gray-700">
          👭 {t('hulp.idee2', { naam })}{' '}
          <Link href={`/groep/${params.id}/vrienden`} className={LINK}>{t('hulp.vrienden')}</Link>
        </p>
        <p className="text-gray-700">🎶 {t('hulp.idee3', { naam })}</p>
      </section>

      <section className="caroo-card space-y-2">
        <h2 className="font-bold text-caroo-donker">{t('hulp.praatTitel')}</h2>
        <p className="text-gray-700">{t('hulp.luisterlijn')}</p>
        <p>
          <a href="tel:0880767000" className={LINK} dir="ltr">088 0767 000</a>
          {' · '}
          <a href="https://www.deluisterlijn.nl" target="_blank" rel="noopener noreferrer" className={LINK}>deluisterlijn.nl</a>
        </p>
      </section>

      <section className="caroo-card space-y-2">
        <h2 className="font-bold text-caroo-donker">{t('hulp.gemeenteTitel')}</h2>
        <p className="text-gray-700">{t('hulp.gemeenteTekst')}</p>
        <p><a href="https://www.eentegeneenzaamheid.nl" target="_blank" rel="noopener noreferrer" className={LINK}>eentegeneenzaamheid.nl</a></p>
      </section>

      <section className="caroo-card space-y-2">
        <h2 className="font-bold text-caroo-donker">{t('hulp.bezoekTitel')}</h2>
        <p className="text-gray-700">{t('hulp.bezoekTekst')}</p>
        <p>
          <a href="https://www.humanitas.nl" target="_blank" rel="noopener noreferrer" className={LINK}>humanitas.nl</a>
          {' · '}
          <a href="https://www.zonnebloem.nl" target="_blank" rel="noopener noreferrer" className={LINK}>zonnebloem.nl</a>
        </p>
      </section>
    </div>
  )
}
