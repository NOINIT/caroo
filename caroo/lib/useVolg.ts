'use client'

import { useState } from 'react'

/**
 * Als useState, maar neemt nieuwe gegevens van de server over zodra de pagina ververst.
 * Zo kun je meteen iets tonen na een tik (optimistisch) en loopt de lijst daarna toch gelijk met de server.
 */
export function useVolg<T>(vanServer: T) {
  const [waarde, setWaarde] = useState(vanServer)
  const [vorige, setVorige] = useState(vanServer)
  if (vorige !== vanServer) {
    setVorige(vanServer)
    setWaarde(vanServer)
  }
  return [waarde, setWaarde] as const
}
