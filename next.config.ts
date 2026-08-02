import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the sandbox preview origin to hit Next.js dev assets directly.
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
