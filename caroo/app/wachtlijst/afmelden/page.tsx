import type { Metadata } from 'next'
import { CarooLogo } from '@/components/ui/CarooLogo'
import { MERK } from '@/lib/merk'
import { AFMELD } from '@/lib/wachtlijst-afmelden'
import { wlTaal } from '@/lib/wachtlijst-teksten'
import { AfmeldKnop } from './AfmeldKnop'

export const metadata: Metadata = { title: `Afmelden · ${MERK.naam}`, robots: { index: false } }

export default function AfmeldPagina({ searchParams }: { searchParams: { c?: string; taal?: string } }) {
  const code = searchParams.c || ''
  const taal = wlTaal(searchParams.taal)
  const tekst = AFMELD[taal]
  return (
    <main lang={taal} className="mx-auto max-w-lg px-6 py-16 text-[#1A2F5A]">
      <CarooLogo />
      <h1 className="mt-10 text-3xl font-bold">{tekst.titel}</h1>
      {code ? (
        <AfmeldKnop code={code} tekst={tekst} />
      ) : (
        <p className="mt-4 text-lg text-gray-700">{tekst.onvolledig}</p>
      )}
    </main>
  )
}
