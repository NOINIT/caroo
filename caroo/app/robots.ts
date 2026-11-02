import type { MetadataRoute } from 'next'

// Zoekmachines mogen de website lezen, niet de app achter de inlog
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/en', '/tr', '/privacy', '/wachtlijst', '/llms.txt'],
      disallow: ['/dashboard', '/groep', '/oudere', '/instellingen', '/betalen', '/api', '/auth', '/uitnodiging', '/login', '/registreer', '/koppel', '/vriend'],
    },
    sitemap: 'https://clanoo.nl/sitemap.xml',
    host: 'https://clanoo.nl',
  }
}
