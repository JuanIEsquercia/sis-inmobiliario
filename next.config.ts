import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static1.adinco.net" },
      { protocol: "https", hostname: "static1.sosiva451.com" },
    ],
  },
};

export default nextConfig;
