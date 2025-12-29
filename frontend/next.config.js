/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Remove webpack config since we're using Turbopack
  // If you need webpack, use: npm run build -- --webpack
  // webpack: (config, { isServer }) => {
  //   return config;
  // },
  
  // Add empty turbopack config to silence the warning
  // This allows Turbopack to work with default settings
  turbopack: {},
  
  // Configure to handle font loading issues
  experimental: {
    // This helps with font loading in some cases
    optimizePackageImports: ['lucide-react'],
  },
  
  // Other Next.js configurations can go here
};

module.exports = nextConfig;