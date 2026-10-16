'use client'

// Zachte geluidjes zonder geluidsbestanden, met respect voor de instelling.
let geluidAan = true

export function zetGeluid(aan: boolean) {
  geluidAan = aan
  try { localStorage.setItem('caroo-geluid', aan ? '1' : '0') } catch {}
}

function leesGeluid() {
  try {
    const v = localStorage.getItem('caroo-geluid')
    if (v !== null) geluidAan = v === '1'
  } catch {}
  return geluidAan
}

export function speelGeluid(soort: 'tik' | 'succes' = 'tik', forceer = false) {
  if (!forceer && !leesGeluid()) return
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const tonen = soort === 'succes' ? [660, 880] : [520]
    tonen.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
    setTimeout(() => ctx.close(), 800)
  } catch {}
}
