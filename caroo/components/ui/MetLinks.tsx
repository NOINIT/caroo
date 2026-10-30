import Link from 'next/link'

/** Zet een vertaalde zin met {voorwaarden} en {privacy} om in tekst met links */
export function MetLinks({ tekst, voorwaarden, privacy }: { tekst: string; voorwaarden: string; privacy: string }) {
  const delen = tekst.split(/(\{voorwaarden\}|\{privacy\})/)
  return (
    <>
      {delen.map((d, i) =>
        d === '{voorwaarden}' ? <Link key={i} href="/voorwaarden" target="_blank" className="underline">{voorwaarden}</Link>
        : d === '{privacy}' ? <Link key={i} href="/privacy" target="_blank" className="underline">{privacy}</Link>
        : <span key={i}>{d}</span>
      )}
    </>
  )
}
