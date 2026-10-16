'use client'

import { useEffect } from 'react'
import { lettergroottePx } from '@/lib/voorkeuren'
import { zetGeluid } from '@/lib/geluid'

export function VoorkeurenToepasser({ lettergrootte, geluid }: { lettergrootte: string; geluid: boolean }) {
  useEffect(() => {
    document.documentElement.style.fontSize = `${lettergroottePx(lettergrootte)}px`
    zetGeluid(geluid)
  }, [lettergrootte, geluid])
  return null
}
