import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Caroo — Zorg voor elkaar',
  description: 'De app voor mantelzorgers en ouderen. Coördineer zorg, bijhoud medicijnen en deel herinneringen.',
  keywords: ['mantelzorg', 'ouderen', 'zorgapp', 'medicijnen', 'agenda'],
  authors: [{ name: 'NOINIT', url: 'https://noinit.nl' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Caroo', statusBarStyle: 'default' },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Caroo — Zorg voor elkaar',
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
    <html lang="nl">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
