import 'server-only'
import { headers } from 'next/headers'
import { isAppUA } from '@/lib/app'

/** Zit deze bezoeker in de Android- of iPhone-app? In de app sluit je geen abonnement af. */
export function isApp() {
  return isAppUA(headers().get('user-agent'))
}
