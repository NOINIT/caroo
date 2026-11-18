import type { Metadata } from 'next'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { MERK } from '@/lib/merk'
import { AfmeldKnop } from './AfmeldKnop'

export const metadata: Metadata = { title: `Afmelden · ${MERK.naam}`, robots: { index: false } }

export default function AfmeldPagina({ searchParams }: { searchParams: { c?: string } }) {
  const code = searchParams.c || ''
  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-[#1A2F5A]">
      <CarooLogo />
      <h1 className="mt-10 text-3xl font-bold">Afmelden voor de wachtlijst</h1>
      {code ? (
        <>
          <p className="mt-4 mb-8 text-lg text-gray-700">Wil je geen mails meer van {MERK.naam} over de wachtlijst? Tik dan op de knop.</p>
          <AfmeldKnop code={code} />
        </>
      ) : (
        <p className="mt-4 text-lg text-gray-700">Deze link is niet compleet. Mail ons op hallo@noinit.nl, dan melden we je af.</p>
      )}
    </main>
  )
}
