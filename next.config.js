/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep config minimal to avoid invalidation/caching warnings
  // Silence workspace root inference by pointing to the project root
  outputFileTracingRoot: process.cwd(),
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve?.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  },
};

module.exports = nextConfig;
