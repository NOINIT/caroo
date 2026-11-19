import type { Metadata } from 'next'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { WachtlijstFormulier } from '@/components/wachtlijst/WachtlijstFormulier'
import { MERK } from '@/lib/merk'
import { Analytics } from '@vercel/analytics/next'

import { WL, wlTaal } from '@/lib/wachtlijst-teksten'

type Zoek = { bron?: string; utm_source?: string; utm_campaign?: string; utm_content?: string; taal?: string }

export async function generateMetadata(props: { searchParams: Promise<Zoek> }): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const w = WL[wlTaal(searchParams.taal)]
  return { title: `${w.titel} · ${MERK.naam}`, description: `${w.omschrijving} ${MERK.tagline}.` }
}

export default async function WachtlijstPagina(props: { searchParams: Promise<Zoek> }) {
  const searchParams = await props.searchParams;
  const taal = wlTaal(searchParams.taal)
  const w = WL[taal]
  // Waar kwam iemand vandaan? bijvoorbeeld instagram-evenlangs-kopje (uit de utm-kenmerken van de campagne)
  const bron = searchParams.bron || [searchParams.utm_source, searchParams.utm_campaign, searchParams.utm_content].filter(Boolean).join('-').toLowerCase().slice(0, 80)
  const o = MERK.oprichters
  const [p1, p2, p3] = w.prijs(o.aantal, o.prijs, o.normaal)

  return (
    <div lang={w.lang} className="min-h-screen bg-white text-caroo-donker">
      <header className="max-w-5xl mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
        <a href={taal === 'nl' ? '/' : `/${taal}`} aria-label={w.logoLabel}><CarooLogo size="md" /></a>
        <span className="text-sm text-gray-600">{w.open}</span>
      </header>

      <main className="max-w-5xl mx-auto px-5 pb-16">
        <section className="grid md:grid-cols-[1.1fr_1fr] gap-10 items-start pt-6 md:pt-12">
          <div>
            <p className="text-[#B4510C] font-bold text-sm tracking-wide uppercase mb-3">{w.plekken(o.aantal)}</p>
            <h1 className="text-[2.1rem] md:text-5xl font-bold leading-tight mb-5 text-balance">{w.kop}</h1>
            <p className="text-lg text-gray-700 leading-relaxed mb-4 max-w-xl">{w.intro}</p>
            <p className="text-lg text-gray-700 leading-relaxed max-w-xl">{p1}<strong>{p2}</strong>{p3}</p>
          </div>

          <div className="md:sticky md:top-6">
            <WachtlijstFormulier bron={bron} taal={taal} />
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mt-16">
          <div className="rounded-caroo-lg bg-caroo-groen-licht p-6">
            <h2 className="text-xl font-bold mb-4">{w.familieKop}</h2>
            <ul className="space-y-3">
              {w.familie.map(t => (
                <li key={t} className="flex gap-3 text-gray-800 leading-snug">
                  <span className="text-caroo-groen font-bold" aria-hidden>✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-caroo-lg bg-caroo-oranje-licht p-6">
            <h2 className="text-xl font-bold mb-4">{w.hoofdKop}</h2>
            <ul className="space-y-3">
              {w.hoofd.map(t => (
                <li key={t} className="flex gap-3 text-gray-800 leading-snug">
                  <span className="text-caroo-oranje font-bold" aria-hidden>✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16 max-w-2xl">
          <h2 className="text-xl font-bold mb-4">{w.wetenKop}</h2>
          <dl className="space-y-4 text-gray-700 leading-relaxed">
            {w.weten.map(([v, a]) => (
              <div key={v}>
                <dt className="font-bold text-caroo-donker">{v}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-6 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>{w.initiatief}</span>
          <a href={`mailto:${MERK.contact}`} className="hover:underline">{MERK.contact}</a>
          <a href="/privacy" className="hover:underline">{w.privacy}</a>
        </div>
      </footer>
      <Analytics />
    </div>
  )
}
