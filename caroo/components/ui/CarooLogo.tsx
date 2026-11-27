// Het officiële Clanoo-logo: beeldmerk plus woordmerk, als één SVG in public/.
export function CarooLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const hoogte = { sm: 26, md: 34, lg: 48 }[size]
  const breedte = Math.round((hoogte * 506) / 90)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-clanoo.svg"
      alt="Clanoo"
      width={breedte}
      height={hoogte}
      style={{ height: hoogte, width: 'auto', display: 'block' }}
    />
  )
}
