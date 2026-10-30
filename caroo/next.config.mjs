/** @type {import('next').NextConfig} */
const nextConfig = {
  // De websitepagina's altijd vers ophalen, zodat een prijswijziging meteen zichtbaar is
  async headers() {
    const vers = [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }]
    return [
      { source: '/', headers: vers },
      { source: '/privacy', headers: vers },
      { source: '/site/:pagina(index.html|privacy.html)', headers: vers },
    ]
  },
  async rewrites() {
    return {
      // De website is statische HTML in public/site. Die gaat voor op de app-routes.
      beforeFiles: [
        { source: '/', destination: '/site/index.html' },
        { source: '/privacy', destination: '/site/privacy.html' },
      ],
    }
  },
};

export default nextConfig;
