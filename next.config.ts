import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pooriaarab/support"],
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/support/articles/:category/:slug.md",
          destination: "/support/md/:category/:slug",
        },
      ],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  turbopack: {},
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
