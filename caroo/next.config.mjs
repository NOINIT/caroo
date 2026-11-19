/** @type {import('next').NextConfig} */
const nextConfig = {
  // Foto's tussen vrienden gaan via een server action; die zijn verkleind, maar geef wat ruimte
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  // We gebruiken next/image niet; zo staat de beeldbewerking van Next (/_next/image) ook niet open
  images: { unoptimized: true },
  poweredByHeader: false,
  // De websitepagina's altijd vers ophalen, zodat een prijswijziging meteen zichtbaar is
  async headers() {
    const vers = [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }]
    // Veiligheidsheaders op elke pagina
    const veilig = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()' },
    ]
    return [
      { source: '/:pad*', headers: veilig },
      { source: '/', headers: vers },
      { source: '/privacy', headers: vers },
      { source: '/account-verwijderen', headers: vers },
      { source: '/voorwaarden', headers: vers },
      { source: '/veelgestelde-vragen', headers: vers },
      { source: '/en/faq', headers: vers },
      { source: '/tr/sss', headers: vers },
      { source: '/en', headers: vers },
      { source: '/tr', headers: vers },
      { source: '/site/:pagina(index.html|privacy.html|voorwaarden.html|account-verwijderen.html|veelgestelde-vragen.html)', headers: vers },
      { source: '/site/:taal(en|tr)/index.html', headers: vers },
      { source: '/site/:pad(en/faq.html|tr/sss.html)', headers: vers },
    ]
  },
  async rewrites() {
    return {
      // De website is statische HTML in public/site. Die gaat voor op de app-routes.
      beforeFiles: [
        { source: '/', destination: '/site/index.html' },
        { source: '/privacy', destination: '/site/privacy.html' },
        { source: '/account-verwijderen', destination: '/site/account-verwijderen.html' },
        { source: '/voorwaarden', destination: '/site/voorwaarden.html' },
        { source: '/veelgestelde-vragen', destination: '/site/veelgestelde-vragen.html' },
        { source: '/en/faq', destination: '/site/en/faq.html' },
        { source: '/tr/sss', destination: '/site/tr/sss.html' },
        { source: '/en', destination: '/site/en/index.html' },
        { source: '/tr', destination: '/site/tr/index.html' },
      ],
    }
  },
};

export default nextConfig;
