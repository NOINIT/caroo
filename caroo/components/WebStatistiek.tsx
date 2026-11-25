'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { isNativeApp } from '@/lib/app'

/**
 * Bezoekersstatistiek zonder cookies, alleen op de website.
 * In de Android- en iPhone-app meten we niets: dan klopt "geen analyse" in de winkelverklaringen.
 * Pas renderen als zeker is dat we niet in de app zitten, anders gaat er al één meting uit.
 */
export function WebStatistiek() {
  const [opWebsite, setOpWebsite] = useState(false)
  useEffect(() => setOpWebsite(!isNativeApp()), [])
  return opWebsite ? <Analytics /> : null
}
