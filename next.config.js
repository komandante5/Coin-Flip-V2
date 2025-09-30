/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep config minimal to avoid invalidation/caching warnings
  // Silence workspace root inference by pointing to the project root
  outputFileTracingRoot: process.cwd(),
  
  // Performance optimizations
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve?.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Additional webpack optimizations
    if (config.mode === 'production') {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    return config;
  },
  env: {
    NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  },
};

export default nextConfig;
