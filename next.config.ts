import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'i.ytimg.com',       // YouTube thumbnails
      'img.youtube.com',   // Alternative YouTube thumbnail domain
      'localhost',         // Local development
      'via.placeholder.com', // Placeholder images
      'i.vimeocdn.com'     // Vimeo thumbnails (optional)
    ],
  },
  /* Analytics configuration */
  analytics: {
    // Enable Vercel Web Analytics
    vercelAnalytics: {
      enabled: true,
    },
  },
};

export default nextConfig;