/** Zet één ingevulde waarde in een vertaalde zin vetgedrukt, bijv. "Mail naar {email}." */
export function MetVet({ tekst, waarde, sleutel }: { tekst: string; waarde: string; sleutel: string }) {
  const [voor, ...rest] = tekst.split(`{${sleutel}}`)
  if (rest.length === 0) return <>{tekst}</>
  return (
    <>
      {voor}
      <strong dir="ltr">{waarde}</strong>
      {rest.join(waarde)}
    </>
  )
}
