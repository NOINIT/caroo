import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { getTaal } from '@/lib/i18n/server'
import { maakT } from '@/lib/i18n/vertaal'
import { taalInfo } from '@/lib/i18n/talen'
import { TaalProvider } from '@/lib/i18n/client'

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
  // Geen nep-fallback: tekens die Atkinson mist (Turks, Arabisch) gaan dan naar de lettertypes hieronder
  adjustFontFallback: false,
})

// Turkse letters als ş, ğ en ı zitten in een apart Atkinson-bestand
const atkinsonExt = localFont({
  src: [
    { path: './fonts/atkinson/atkinson-hyperlegible-latin-ext-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/atkinson/atkinson-hyperlegible-latin-ext-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-atkinson-ext',
  preload: false,
  adjustFontFallback: false,
})

// Arabisch: Noto Sans Arabic (SIL Open Font License), rustig en goed leesbaar
const notoArabisch = localFont({
  src: [
    { path: './fonts/noto-arabic/noto-sans-arabic-arabic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-arabic/noto-sans-arabic-arabic-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-arabisch',
  preload: false,
  adjustFontFallback: false,
})

export async function generateMetadata(): Promise<Metadata> {
  const taal = await getTaal()
  const t = maakT(taal)
  return {
    title: t('meta.titel'),
    description: t('meta.omschrijving'),
    authors: [{ name: 'NOINIT', url: 'https://noinit.nl' }],
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: 'Clanoo', statusBarStyle: 'default' },
    icons: {
      icon: '/icons/icon-192.png',
      apple: '/icons/apple-touch-icon.png',
    },
    openGraph: {
      title: t('meta.titel'),
      description: t('meta.omschrijving'),
      type: 'website',
      locale: taalInfo(taal).locale.slice(0, 5).replace('-', '_'),
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#1A7A6E',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const taal = await getTaal()
  const info = taalInfo(taal)
  return (
    <html lang={taal} dir={info.dir} className={`${atkinson.variable} ${atkinsonExt.variable} ${notoArabisch.variable}`}>
      <body className="font-sans antialiased">
        <TaalProvider taal={taal}>{children}</TaalProvider>
      </body>
    </html>
  )
}
