import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  },
  async redirects() {
    return [
      { source: "/yfirlit", destination: "/dashboard", permanent: false },
      { source: "/manudir", destination: "/monthly-overview", permanent: false },
      { source: "/tekjur", destination: "/income", permanent: false },
      { source: "/faerslur", destination: "/transactions", permanent: false },
      { source: "/utgjold", destination: "/expenses", permanent: false },
      { source: "/reikningar", destination: "/bills", permanent: false },
      { source: "/sparnadur", destination: "/savings-goals", permanent: false },
      { source: "/fasteignir", destination: "/real-estate", permanent: false },
      { source: "/markadir", destination: "/markets", permanent: false },
      { source: "/greining", destination: "/analytics", permanent: false },
      { source: "/stillingar", destination: "/settings", permanent: false }
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "form-action 'self'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co"
            ].join("; ")
          }
        ]
      }
    ];
  }
};

export default nextConfig;
