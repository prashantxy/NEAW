import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverRuntimeConfig: {
    headers: {
      'max-http-header-size': 16384, // Increase from the default (8KB) to 16KB
    },
  },
  // Other config options can be added here if needed
};

export default nextConfig;