'use client'

import { createContext, useContext, useMemo } from 'react'
import { maakT, datum, tijd } from './vertaal'
import { STANDAARD_TAAL, taalInfo, type Taal } from './talen'

const TaalContext = createContext<Taal>(STANDAARD_TAAL)

export function TaalProvider({ taal, children }: { taal: Taal; children: React.ReactNode }) {
  return <TaalContext.Provider value={taal}>{children}</TaalContext.Provider>
}

export function useTaal() {
  return useContext(TaalContext)
}

/** Vertaalfunctie plus handige helpers voor datum en tijd */
export function useT() {
  const taal = useTaal()
  return useMemo(() => {
    const t = maakT(taal)
    return {
      t,
      taal,
      info: taalInfo(taal),
      datum: (d: string | number | Date, o: Intl.DateTimeFormatOptions) => datum(taal, d, o),
      tijd: (d: string | number | Date) => tijd(taal, d),
    }
  }, [taal])
}
