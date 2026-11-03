/** Bedenktijd na het afsluiten van een abonnement (EU-richtlijn 2023/2673, BW 6:230o). */
export const BEDENKTIJD_DAGEN = 14

export function bedenktijdEinde(sinds: string | Date) {
  return new Date(new Date(sinds).getTime() + BEDENKTIJD_DAGEN * 86400000)
}

export function binnenBedenktijd(sinds: string | Date | null | undefined) {
  return !!sinds && bedenktijdEinde(sinds).getTime() > Date.now()
}
