import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // Align with document/avatar upload limit in services (10MB)
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
