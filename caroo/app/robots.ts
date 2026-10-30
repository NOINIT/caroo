import type { MetadataRoute } from 'next'

// Zoekmachines mogen de website lezen, niet de app achter de inlog
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/voorwaarden', '/wachtlijst'],
      disallow: ['/dashboard', '/groep', '/oudere', '/instellingen', '/betalen', '/api', '/auth', '/uitnodiging', '/login', '/registreer'],
    },
    sitemap: 'https://clanoo.nl/sitemap.xml',
    host: 'https://clanoo.nl',
  }
}
