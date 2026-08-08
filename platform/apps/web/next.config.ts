import type { NextConfig } from "next";

/**
 * Next 16 App Router config (Turbopack by default).
 * Sites foundation folders (.openai, optional worker) stay deploy-ready;
 * this slice builds with Next and does not deploy.
 *
 * Webpack `extensionAlias` was removed: Turbopack is the default bundler and
 * web lib imports use extensionless relative paths. Canonical alias detection
 * in proxy.ts reads the raw request URL string via extractRawPathname — keep
 * skipProxyUrlNormalize off so prerendered `activity%3A…` routes still match.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [],
};

export default nextConfig;
