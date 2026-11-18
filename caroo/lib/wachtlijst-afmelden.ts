import { MERK } from '@/lib/merk'

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'

/** Persoonlijke afmeldlink voor de wachtlijst */
export const afmeldLink = (code: string) => `${BASIS_URL}/wachtlijst/afmelden?c=${encodeURIComponent(code)}`

/** Voetregel onder elke wachtlijstmail */
export const afmeldVoet = (code: string) =>
  `<p style="font-size:12px;color:#9CA3AF;margin-top:24px">Je ontvangt deze mail omdat je je aanmeldde voor de wachtlijst van ${MERK.naam}. Geen mails meer? <a href="${afmeldLink(code)}" style="color:#9CA3AF">Meld je hier af</a>.</p>`
