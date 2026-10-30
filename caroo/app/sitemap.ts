import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const nu = new Date()
  return [
    { url: 'https://clanoo.nl/', lastModified: nu, changeFrequency: 'weekly', priority: 1 },
    { url: 'https://clanoo.nl/wachtlijst', lastModified: nu, changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://clanoo.nl/privacy', lastModified: nu, changeFrequency: 'yearly', priority: 0.4 },
    { url: 'https://clanoo.nl/voorwaarden', lastModified: nu, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
