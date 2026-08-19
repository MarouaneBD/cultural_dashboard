import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable client-side router cache for dynamic routes.
    // Without this, Next.js 16 can serve a cached page (from the previous
    // user's session) after logout + re-login, so assignedPillarId / role
    // changes aren't reflected until a hard refresh.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;
