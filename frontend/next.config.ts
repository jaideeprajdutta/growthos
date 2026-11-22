import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Auth is resolved in the browser against the FastAPI backend, so every
  // route is client-driven. Opt out of implicit instant-navigation validation
  // until the session is moved into a cacheable server boundary.
  experimental: {
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
