import 'server-only'

/** Verstuur een mail via Resend. Faalt stil: een mail mag een actie nooit breken. */
export async function stuurMail(opts: { naar: string; onderwerp: string; html: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MELDING_AFZENDER || 'Caroo <caroo@noinit.nl>',
        to: [opts.naar],
        subject: opts.onderwerp,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
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
