import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/reclamation-yard/:slug",
        destination: "/yards/:slug",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "thereclaimedcompany.com",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
