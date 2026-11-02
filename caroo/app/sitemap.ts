import type { MetadataRoute } from 'next'

const TALEN = { nl: 'https://clanoo.nl/', en: 'https://clanoo.nl/en', tr: 'https://clanoo.nl/tr' }

export default function sitemap(): MetadataRoute.Sitemap {
  const nu = new Date()
  return [
    { url: 'https://clanoo.nl/', lastModified: nu, changeFrequency: 'weekly', priority: 1, alternates: { languages: TALEN } },
    { url: 'https://clanoo.nl/en', lastModified: nu, changeFrequency: 'weekly', priority: 0.9, alternates: { languages: TALEN } },
    { url: 'https://clanoo.nl/tr', lastModified: nu, changeFrequency: 'weekly', priority: 0.9, alternates: { languages: TALEN } },
    { url: 'https://clanoo.nl/wachtlijst', lastModified: nu, changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://clanoo.nl/privacy', lastModified: nu, changeFrequency: 'yearly', priority: 0.4 },
  ]
}
