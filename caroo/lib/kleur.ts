// Kies de tekstkleur die het best leesbaar is op een achtergrondkleur
// (bijvoorbeeld een agendacategorie die de familie zelf kiest).
function luminantie(hex: string) {
  const h = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const DONKER = '#1A2F5A'

export function tekstKleurOp(achtergrond: string) {
  const l = luminantie(achtergrond)
  const metWit = 1.05 / (l + 0.05)
  const metDonker = (l + 0.05) / (luminantie(DONKER) + 0.05)
  return metWit >= metDonker ? '#FFFFFF' : DONKER
}
