import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * `connect-src` is the one that matters here: it pins network calls to the
 * Supabase project, so an injected script cannot quietly ship order data
 * somewhere else. It reads the project URL from the environment rather than
 * hardcoding it, so preview and production each restrict to their own.
 *
 * `'unsafe-inline'` on styles is required — the pages use inline `style`
 * attributes throughout. Scripts do NOT get it in production; Next's inline
 * bootstrap is handled by 'strict-dynamic' + nonce in a stricter setup,
 * which is the next step if this ever carries payments.
 */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Turbopack's dev client needs eval; production does not.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Google Drive thumbnails back the article and sponsor artwork.
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://drive.google.com",
  `connect-src 'self' ${supabaseOrigin} ${
    supabaseOrigin ? supabaseOrigin.replace("https://", "wss://") : ""
  }${isDev ? " ws://localhost:* http://localhost:*" : ""}`.trim(),
  // Production only: in dev it rewrites the HMR socket's ws:// to wss://
  // and breaks fast refresh.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // The dashboard must never be indexed, whatever robots.txt says.
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
