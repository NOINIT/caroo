import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Atkinson Hyperlegible (Braille Institute, SIL Open Font License): extra goed leesbaar,
// ook voor slechtzienden. De bestanden zitten in de app zelf, dus elk toestel toont
// hetzelfde lettertype en er wordt niets bij een externe partij opgehaald.
const atkinson = localFont({
  src: [
    { path: './fonts/atkinson/atkinson-hyperlegible-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/atkinson/atkinson-hyperlegible-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/atkinson/atkinson-hyperlegible-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/atkinson/atkinson-hyperlegible-latin-700-italic.woff2', weight: '700', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-atkinson',
})

export const metadata: Metadata = {
  title: 'Clanoo — Zorg voor elkaar',
  description: 'De app voor mantelzorgers en ouderen. Coördineer zorg, bijhoud medicijnen en deel herinneringen.',
  keywords: ['mantelzorg', 'ouderen', 'zorgapp', 'medicijnen', 'agenda'],
  authors: [{ name: 'NOINIT', url: 'https://noinit.nl' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Clanoo', statusBarStyle: 'default' },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Clanoo — Zorg voor elkaar',
    description: 'Eén app voor de hele zorggroep. €19,99 per jaar.',
    type: 'website',
    locale: 'nl_NL',
  },
}

export const viewport: Viewport = {
  themeColor: '#1A7A6E',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={atkinson.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
