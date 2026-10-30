import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // La branche historique initialise SQLite pendant la collecte des pages.
  ...(process.env.MAVIE_BUILD === "1" ? { experimental: { cpus: 1 } } : {}),
  // Le traceur oublie certains runtimes de Next (routes API + instrumentation).
  outputFileTracingIncludes: {
    "/*": ["./node_modules/next/dist/compiled/next-server/**/*"],
  },
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./build-data/**/*", "./dist/**/*", "./.env*"],
  },
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
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
