import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typedRoutes: true,
  cacheComponents: true,
  experimental: {
    authInterrupts: true,
    viewTransition: true,
  },
  rewrites: async () => {
    if (!process.env.API_URL) {
      throw new Error("API_URL environment variable is not defined");
    }

    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;