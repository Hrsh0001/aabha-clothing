/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: '/shop', destination: '/' },
      { source: '/about', destination: '/' },
      { source: '/contact', destination: '/' },
      { source: '/policy', destination: '/' },
      { source: '/pages/:slug', destination: '/' },
      { source: '/page/:slug', destination: '/' },
    ];
  },
};

export default nextConfig;
