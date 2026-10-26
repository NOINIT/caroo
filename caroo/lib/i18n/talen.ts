export const TALEN = [
  { code: 'nl', naam: 'Nederlands', dir: 'ltr', locale: 'nl-NL', spraak: 'nl-NL' },
  { code: 'en', naam: 'English', dir: 'ltr', locale: 'en-GB', spraak: 'en-GB' },
  { code: 'tr', naam: 'Türkçe', dir: 'ltr', locale: 'tr-TR', spraak: 'tr-TR' },
  // Westerse cijfers in het Arabisch: duidelijker naast Nederlandse tijden en data
  { code: 'ar', naam: 'العربية', dir: 'rtl', locale: 'ar-u-nu-latn', spraak: 'ar-SA' },
] as const

export type Taal = (typeof TALEN)[number]['code']
export const STANDAARD_TAAL: Taal = 'nl'
export const TAAL_COOKIE = 'clanoo-taal'

export function isTaal(x: unknown): x is Taal {
  return typeof x === 'string' && TALEN.some(t => t.code === x)
}

export function taalInfo(taal: Taal) {
  return TALEN.find(t => t.code === taal) ?? TALEN[0]
}

/** Stripe kent geen Arabische betaalpagina; dan kiest Stripe zelf (meestal Engels). */
export function stripeTaal(taal: Taal): 'nl' | 'en' | 'tr' | 'auto' {
  return taal === 'ar' ? 'auto' : taal
}
