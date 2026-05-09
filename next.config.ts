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
      { source: "/greining", destination: "/analytics", permanent: false },
      { source: "/stillingar", destination: "/settings", permanent: false }
    ];
  }
};

export default nextConfig;
