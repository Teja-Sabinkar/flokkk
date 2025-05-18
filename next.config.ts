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
      'i.vimeocdn.com',    // Vimeo thumbnails (optional)
      'picsum.photos',     // Lorem Picsum for mock images
      'images.unsplash.com', // Unsplash images (common for mockups)
      'avatars.githubusercontent.com', // GitHub avatars
      'lh3.googleusercontent.com', // Google profile pictures
      'platform-lookaside.fbsbx.com' // Facebook profile pictures
    ],
  },
  /* any other config options you might have */
};

export default nextConfig;