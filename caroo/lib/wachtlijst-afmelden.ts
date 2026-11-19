import { MERK } from '@/lib/merk'

const BASIS_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clanoo.nl'

/** Persoonlijke afmeldlink voor de wachtlijst */
export const afmeldLink = (code: string, taal: 'nl' | 'en' | 'tr' = 'nl') =>
  `${BASIS_URL}/wachtlijst/afmelden?c=${encodeURIComponent(code)}${taal === 'nl' ? '' : `&taal=${taal}`}`

/** Voetregel onder elke wachtlijstmail */
const VOET = {
  nl: ['Je ontvangt deze mail omdat je je aanmeldde voor de wachtlijst van ' + MERK.naam + '. Geen mails meer?', 'Meld je hier af'],
  en: ['You are receiving this email because you joined the ' + MERK.naam + ' waiting list. No more emails?', 'Unsubscribe here'],
  tr: [MERK.naam + ' bekleme listesine kaydolduğun için bu e-postayı alıyorsun. Artık e-posta istemiyor musun?', 'Buradan çık'],
}
export const afmeldVoet = (code: string, taal: 'nl' | 'en' | 'tr' = 'nl') =>
  `<p style="font-size:12px;color:#9CA3AF;margin-top:24px">${VOET[taal][0]} <a href="${afmeldLink(code, taal)}" style="color:#9CA3AF">${VOET[taal][1]}</a>.</p>`

/** Teksten van de afmeldpagina */
export const AFMELD = {
  nl: { titel: 'Afmelden voor de wachtlijst', vraag: `Geen mails meer van ${MERK.naam} over de wachtlijst? Dan meld je je hier af.`, knop: 'Ja, meld me af', bezig: 'Even geduld…', klaar: 'Je bent afgemeld. Je krijgt geen mails meer over de wachtlijst.', mis: 'Dat lukte niet. Mail ons gerust op hallo@noinit.nl, dan regelen we het.', onvolledig: 'Deze link is niet compleet. Mail ons op hallo@noinit.nl, dan melden we je af.' },
  en: { titel: 'Leave the waiting list', vraag: `No more emails from ${MERK.naam} about the waiting list? Unsubscribe here.`, knop: 'Yes, unsubscribe me', bezig: 'One moment…', klaar: 'You have been unsubscribed. You will not get any more emails about the waiting list.', mis: 'That didn’t work. Feel free to email us at hallo@noinit.nl and we’ll sort it out.', onvolledig: 'This link is incomplete. Email us at hallo@noinit.nl and we’ll unsubscribe you.' },
  tr: { titel: 'Bekleme listesinden çık', vraag: `${MERK.naam} bekleme listesiyle ilgili artık e-posta istemiyor musun? Buradan çıkabilirsin.`, knop: 'Evet, listeden çıkar', bezig: 'Bir dakika…', klaar: 'Listeden çıkarıldın. Bekleme listesiyle ilgili artık e-posta almayacaksın.', mis: 'Bu olmadı. hallo@noinit.nl adresine yazabilirsin, biz hallederiz.', onvolledig: 'Bu bağlantı eksik. hallo@noinit.nl adresine yaz, seni listeden çıkaralım.' },
}
