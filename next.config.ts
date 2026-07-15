import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep output tracing inside this app (helps Vercel package Next 16 correctly)
  turbopack: {
    root: path.join(/* turbopackIgnore: true */ process.cwd()),
  },
  outputFileTracingRoot: path.join(/* turbopackIgnore: true */ process.cwd()),
  experimental: {
    // Align with document/avatar upload limit in services (10MB)
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
