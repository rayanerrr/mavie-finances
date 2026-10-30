import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // La branche historique initialise SQLite pendant la collecte des pages.
  ...(process.env.MAVIE_BUILD === "1" ? { experimental: { cpus: 1 } } : {}),
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./build-data/**/*", "./dist/**/*", "./.env*"],
  },
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
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
