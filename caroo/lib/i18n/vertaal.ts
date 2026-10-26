import { nl } from './woordenboeken/nl'
import { en } from './woordenboeken/en'
import { tr } from './woordenboeken/tr'
import { ar } from './woordenboeken/ar'
import { type Taal, taalInfo } from './talen'

/** Structuur van het woordenboek: dezelfde sleutels als het Nederlandse, met tekst als waarde. */
export type Woordenboek<T = typeof nl> = { [K in keyof T]: T[K] extends string ? string : Woordenboek<T[K]> }

type Paden<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paden<T[K], `${P}${K}.`>
}[keyof T & string]

export type Sleutel = Paden<typeof nl>
export type Variabelen = Record<string, string | number>

const BOEKEN: Record<Taal, Woordenboek> = { nl, en, tr, ar }

function zoek(boek: unknown, sleutel: string): string | undefined {
  let hier: any = boek
  for (const deel of sleutel.split('.')) {
    if (hier == null) return undefined
    hier = hier[deel]
  }
  return typeof hier === 'string' ? hier : undefined
}

/** Maak een vertaalfunctie voor één taal. Ontbreekt een tekst, dan valt hij terug op Nederlands. */
export function maakT(taal: Taal) {
  const boek = BOEKEN[taal] ?? nl
  return function t(sleutel: Sleutel, vars?: Variabelen): string {
    let tekst = zoek(boek, sleutel) ?? zoek(nl, sleutel) ?? sleutel
    if (vars) for (const [k, v] of Object.entries(vars)) tekst = tekst.split(`{${k}}`).join(String(v))
    return tekst
  }
}

export type TFunctie = ReturnType<typeof maakT>

/** Datum en tijd in de taal van de gebruiker */
export function datum(taal: Taal, d: string | number | Date, opties: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString(taalInfo(taal).locale, opties)
}
export function tijd(taal: Taal, d: string | number | Date) {
  // Altijd 24-uursklok (14:30), ook in het Engels en Arabisch: zo leest iedereen hetzelfde tijdstip
  return new Date(d).toLocaleTimeString(taalInfo(taal).locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

/** Codes voor 'wanneer kom je langs'. Oude, vrije tekst wordt gewoon getoond zoals hij is. */
export const WANNEER_CODES = ['binnen_uur', 'vanmiddag', 'vanavond', 'morgen'] as const

export function wanneerTekst(t: TFunctie, w: string | null | undefined): string {
  if (!w) return ''
  if ((WANNEER_CODES as readonly string[]).includes(w)) return t(`wanneer.${w}` as Sleutel)
  if (w.startsWith('tijd:')) return t('wanneer.vandaagRond', { tijd: w.slice(5) })
  return w
}

export function hoofdletter(s: string) {
  return s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s
}

export function stemmingLabel(t: TFunctie, waarde: number) {
  return t(`stemming.s${waarde}` as Sleutel)
}

export function rolTekst(t: TFunctie, rol: string) {
  return ['groepsbeheerder', 'mantelzorger', 'oudere'].includes(rol) ? t(`rollen.${rol}` as Sleutel) : rol
}

/** Huidige jaarprijs. Wordt bijgewerkt zodra de nieuwe prijzen live gaan. */
export const JAARPRIJS = '€19,99'

/** Standaardcategorieën van de agenda staan in het Nederlands in de database; die vertalen we bij het tonen. */
const STANDAARD_CATEGORIEEN = ['Zorgafspraak', 'Verjaardag', 'Jubileum', 'Feestje', 'Herdenking', 'Overig']
export function categorieTekst(t: TFunctie, naam: string | null | undefined) {
  if (!naam) return ''
  return STANDAARD_CATEGORIEEN.includes(naam) ? t(`categorie.${naam}` as Sleutel) : naam
}
