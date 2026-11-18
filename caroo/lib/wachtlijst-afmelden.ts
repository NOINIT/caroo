import { MERK } from '@/lib/merk'

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'

/** Persoonlijke afmeldlink voor de wachtlijst */
export const afmeldLink = (code: string) => `${BASIS_URL}/wachtlijst/afmelden?c=${encodeURIComponent(code)}`

/** Voetregel onder elke wachtlijstmail */
const VOET = {
  nl: ['Je ontvangt deze mail omdat je je aanmeldde voor de wachtlijst van ' + MERK.naam + '. Geen mails meer?', 'Meld je hier af'],
  en: ['You are receiving this email because you joined the ' + MERK.naam + ' waiting list. No more emails?', 'Unsubscribe here'],
  tr: [MERK.naam + ' bekleme listesine kaydolduğun için bu e-postayı alıyorsun. Artık e-posta istemiyor musun?', 'Buradan çık'],
}
export const afmeldVoet = (code: string, taal: 'nl' | 'en' | 'tr' = 'nl') =>
  `<p style="font-size:12px;color:#9CA3AF;margin-top:24px">${VOET[taal][0]} <a href="${afmeldLink(code)}" style="color:#9CA3AF">${VOET[taal][1]}</a>.</p>`
