/** @type {import('next').NextConfig} */
const nextConfig = {
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
