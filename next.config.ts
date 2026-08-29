import type { NextConfig } from "next";

const API_BASE =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

const API_ORIGIN = API_BASE.replace(/\/api\/v1$/, "").replace(/\/api$/, "");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },

  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
