// 'actief: false' = de vertaling blijft bewaard, maar niemand kan de taal kiezen.
// Arabisch staat uit (oktober 2026: te kleine doelgroep). Terugzetten = actief op true.
export const TALEN = [
  { code: 'nl', naam: 'Nederlands', dir: 'ltr', locale: 'nl-NL', spraak: 'nl-NL', actief: true },
  { code: 'en', naam: 'English', dir: 'ltr', locale: 'en-GB', spraak: 'en-GB', actief: true },
  { code: 'tr', naam: 'Türkçe', dir: 'ltr', locale: 'tr-TR', spraak: 'tr-TR', actief: true },
  // Westerse cijfers in het Arabisch: duidelijker naast Nederlandse tijden en data
  { code: 'ar', naam: 'العربية', dir: 'rtl', locale: 'ar-u-nu-latn', spraak: 'ar-SA', actief: false },
] as const

/** De talen die gebruikers kunnen kiezen */
export const KIESBARE_TALEN = TALEN.filter(t => t.actief)

export type Taal = (typeof TALEN)[number]['code']
export const STANDAARD_TAAL: Taal = 'nl'
export const TAAL_COOKIE = 'clanoo-taal'

export function isTaal(x: unknown): x is Taal {
  // Een taal die uit staat telt niet: wie die nog had ingesteld, krijgt Nederlands
  return typeof x === 'string' && KIESBARE_TALEN.some(t => t.code === x)
}

export function taalInfo(taal: Taal) {
  return TALEN.find(t => t.code === taal) ?? TALEN[0]
}

/** Stripe kent geen Arabische betaalpagina; dan kiest Stripe zelf (meestal Engels). */
export function stripeTaal(taal: Taal): 'nl' | 'en' | 'tr' | 'auto' {
  return taal === 'ar' ? 'auto' : taal
}
