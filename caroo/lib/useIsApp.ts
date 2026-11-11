'use client'
import { useEffect, useState } from 'react'
import { isNativeApp } from '@/lib/app'

/** true zodra duidelijk is dat de pagina in de Android- of iPhone-app draait. */
export function useIsApp() {
  const [inApp, setInApp] = useState(false)
  useEffect(() => setInApp(isNativeApp()), [])
  return inApp
}
