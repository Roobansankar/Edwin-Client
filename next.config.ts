import type { NextConfig } from "next";

const API_BASE =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
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
