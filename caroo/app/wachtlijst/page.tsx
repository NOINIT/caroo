import type { Metadata } from 'next'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { WachtlijstFormulier } from '@/components/wachtlijst/WachtlijstFormulier'
import { MERK } from '@/lib/merk'

export const metadata: Metadata = {
  title: `Wachtlijst · ${MERK.naam}`,
  description: `Word een van de eerste ${MERK.oprichters.aantal} oprichtersfamilies van ${MERK.naam}. ${MERK.tagline}.`,
}

const voorDeFamilie = [
  'Eén agenda voor afspraken bij de huisarts, het ziekenhuis of de kapper',
  'Taken verdelen, zodat niet alles op één persoon neerkomt',
  'Een gedeelde boodschappenlijst die iedereen kan aanvullen',
  'Medicijnen op een rij, met wie wat wanneer geeft',
]
const voorDeHoofdpersoon = [
  'Grote letters en grote knoppen, zonder wachtwoord inloggen',
  'Elke dag laten weten hoe het gaat, met één tik op een smiley',
  'Zelf om bezoek vragen, en zien wie er komt en wanneer',
  'Foto’s van de familie en eigen verhalen inspreken',
]

export default function WachtlijstPagina({ searchParams }: { searchParams: { bron?: string; utm_source?: string } }) {
  const bron = searchParams.bron || searchParams.utm_source || ''
  const o = MERK.oprichters

  return (
    <div className="min-h-screen bg-white text-caroo-donker">
      <header className="max-w-5xl mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
        <CarooLogo size="md" />
        <span className="text-sm text-gray-500">Open op {MERK.lancering}</span>
      </header>

      <main className="max-w-5xl mx-auto px-5 pb-16">
        <section className="grid md:grid-cols-[1.1fr_1fr] gap-10 items-start pt-6 md:pt-12">
          <div>
            <p className="text-caroo-oranje font-bold text-sm tracking-wide uppercase mb-3">
              Nog {o.aantal} oprichtersplekken
            </p>
            <h1 className="text-[2.1rem] md:text-5xl font-bold leading-tight mb-5 text-balance">
              Zorg voor elkaar, samen georganiseerd.
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed mb-4 max-w-xl">
              {MERK.naam} brengt de familie samen rond de persoon om wie het draait. Afspraken, medicijnen,
              boodschappen en wie er wanneer langskomt staan op één plek. En de persoon om wie het gaat, doet zelf mee.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed max-w-xl">
              De eerste {o.aantal} families worden oprichtersfamilie en betalen <strong>{o.prijs} voor het eerste jaar</strong>{' '}
              in plaats van {o.normaal}.
            </p>
          </div>

          <div className="md:sticky md:top-6">
            <WachtlijstFormulier bron={bron} />
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mt-16">
          <div className="rounded-caroo-lg bg-caroo-groen-licht p-6">
            <h2 className="text-xl font-bold mb-4">Voor de familie</h2>
            <ul className="space-y-3">
              {voorDeFamilie.map(t => (
                <li key={t} className="flex gap-3 text-gray-800 leading-snug">
                  <span className="text-caroo-groen font-bold" aria-hidden>✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-caroo-lg bg-caroo-oranje-licht p-6">
            <h2 className="text-xl font-bold mb-4">Voor de hoofdpersoon</h2>
            <ul className="space-y-3">
              {voorDeHoofdpersoon.map(t => (
                <li key={t} className="flex gap-3 text-gray-800 leading-snug">
                  <span className="text-caroo-oranje font-bold" aria-hidden>✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16 max-w-2xl">
          <h2 className="text-xl font-bold mb-4">Goed om te weten</h2>
          <dl className="space-y-4 text-gray-700 leading-relaxed">
            <div>
              <dt className="font-bold text-caroo-donker">Wat kost het?</dt>
              <dd>
                {o.prijs} voor het eerste jaar als oprichtersfamilie, daarna {o.normaal} per jaar. Dat is per familie:
                iedereen die je uitnodigt doet mee zonder extra kosten. Opzeggen kan altijd tegen het einde van het jaar.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-caroo-donker">Zit ik ergens aan vast?</dt>
              <dd>Nee. De wachtlijst is vrijblijvend. Op {MERK.lancering} krijg je een mail en beslis je of je je plek neemt.</dd>
            </div>
            <div>
              <dt className="font-bold text-caroo-donker">Wat gebeurt er met onze gegevens?</dt>
              <dd>Alles staat op servers in Europa en is alleen zichtbaar voor de mensen in jullie eigen groep. We verkopen nooit gegevens.</dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-6 text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>{MERK.naam} is een initiatief van {MERK.moederbedrijf}, {MERK.plaats}</span>
          <span>{MERK.contact}</span>
        </div>
      </footer>
    </div>
  )
}
