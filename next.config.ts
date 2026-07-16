import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-ical (via rrule-temporal/temporal-polyfill) breaks when bundled
  // through Turbopack's SSR pipeline ("h.BigInt is not a function") — keep it
  // as a plain Node require() instead of transforming it.
  serverExternalPackages: ["node-ical", "@react-pdf/renderer"],
};

export default nextConfig;
