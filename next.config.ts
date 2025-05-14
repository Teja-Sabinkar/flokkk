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
      'i.ytimg.com',        // YouTube thumbnails
      'img.youtube.com',    // Alternative YouTube thumbnail domain
      'localhost',          // Local development
      'via.placeholder.com',// Placeholder images
      'i.vimeocdn.com',     // Vimeo thumbnails (optional)
      'vercel-blob.com',
    '*.blob.vercel-storage.com' // This will cover all Vercel Blob domains
    ],
  },
  /* any other config options you might have */
};

export default nextConfig;