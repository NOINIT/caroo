import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Caroo — Zorg voor elkaar',
  description: 'De app voor mantelzorgers en ouderen. Coördineer zorg, bijhoud medicijnen en deel herinneringen.',
  keywords: ['mantelzorg', 'ouderen', 'zorgapp', 'medicijnen', 'agenda'],
  authors: [{ name: 'NOINIT', url: 'https://noinit.nl' }],
  openGraph: {
    title: 'Caroo — Zorg voor elkaar',
    description: 'Eén app voor de hele zorggroep. Eenmalig €4,99.',
    type: 'website',
    locale: 'nl_NL',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
