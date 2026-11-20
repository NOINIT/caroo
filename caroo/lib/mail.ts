import 'server-only'

// Mails van Clanoo gaan via Lettermint (Nederlands bedrijf, servers alleen in de EU).
const AFZENDER = () => process.env.MELDING_AFZENDER || 'Clanoo <clanoo@noinit.nl>'

/** Verstuur een mail. Faalt stil: een mail mag een actie nooit breken. */
export async function stuurMail(opts: { naar: string; onderwerp: string; html: string; replyTo?: string }) {
  try {
    const lettermint = process.env.LETTERMINT_TOKEN
    if (!lettermint) return false
    const res = await fetch('https://api.lettermint.co/v1/send', {
      method: 'POST',
      headers: { 'x-lettermint-token': lettermint, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: AFZENDER(),
        to: [opts.naar],
        subject: opts.onderwerp,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: [opts.replyTo] } : {}),
        // Niet bijhouden wie een mail opent of op een link klikt
        settings: { track_opens: false, track_clicks: false },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function escapeHtml(t: string) {
  return t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
