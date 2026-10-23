/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
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
