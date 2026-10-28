import Link from 'next/link'
import { datum, type TFunctie } from '@/lib/i18n/vertaal'
import type { Taal } from '@/lib/i18n/talen'
import { DownloadKnop } from './DownloadKnop'

interface Props {
  t: TFunctie
  taal: Taal
  terugHref: string
  groepNaam: string
  naam: string
  van: string | null
  tot: string | null
  verhalen: { id: string; inhoud: string; gesproken: boolean; aangemaakt_op: string }[]
  tips: { id: string; tekst: string; aangemaakt_op: string }[]
}

/** Het boekje zelf: voorkant, verhalen en tips. Netjes op scherm en op papier. */
export function BoekjeInhoud({ t, taal, terugHref, groepNaam, naam, van, tot, verhalen, tips }: Props) {
  const lang = { day: 'numeric', month: 'long', year: 'numeric' } as const
  const alles = verhalen.length + tips.length
  return (
    <div className="min-h-screen bg-[#F7F4EF] print:bg-white">
      <style>{`@media print { @page { margin: 18mm; } .boekje-verhaal { break-inside: avoid; } }`}</style>

      <header className="print:hidden bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link href={terugHref} className="text-gray-500 text-sm">
            <span className="inline-block rtl:rotate-180">←</span> {t('algemeen.terug')}
          </Link>
          <DownloadKnop />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 print:p-0">
        <p className="print:hidden text-sm text-gray-500 mb-8 bg-white rounded-caroo p-3">{t('boekje.uitleg')}</p>

        {/* Voorkant */}
        <section className="text-center py-16 print:py-24 print:break-after-page">
          <p className="text-caroo-oranje font-bold tracking-wide">{groepNaam}</p>
          <h1 className="text-4xl font-bold text-caroo-donker mt-3 leading-tight">{t('boekje.titel', { naam })}</h1>
          {van && tot && (
            <p className="text-gray-500 mt-4">{datum(taal, van, lang)} – {datum(taal, tot, lang)}</p>
          )}
        </section>

        {alles === 0 && (
          <p className="text-center text-gray-500 py-10">{t('boekje.leeg')}</p>
        )}

        {verhalen.length > 0 && (
          <section className="mt-6">
            <h2 className="text-2xl font-bold text-caroo-donker mb-6">{t('boekje.verhalen')}</h2>
            <div className="space-y-8">
              {verhalen.map((v: any) => (
                <article key={v.id} className="boekje-verhaal">
                  <p className="text-sm text-gray-500 mb-2">
                    {datum(taal, v.aangemaakt_op, lang)}
                    {v.gesproken && <span> · {t('boekje.ingesproken')}</span>}
                  </p>
                  <p dir="auto" className="text-lg leading-relaxed text-caroo-donker whitespace-pre-wrap">{v.inhoud}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {tips.length > 0 && (
          <section className="mt-14 print:break-before-page">
            <h2 className="text-2xl font-bold text-caroo-donker mb-6">{t('boekje.tips')}</h2>
            <div className="space-y-6">
              {tips.map((tip: any) => (
                <article key={tip.id} className="boekje-verhaal border-s-4 border-caroo-oranje ps-4">
                  <p dir="auto" className="text-lg leading-relaxed text-caroo-donker whitespace-pre-wrap">{tip.tekst}</p>
                  <p className="text-sm text-gray-500 mt-1">{datum(taal, tip.aangemaakt_op, lang)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-gray-400 mt-16">{t('boekje.gemaaktMet')}</p>
      </main>
    </div>
  )
}
