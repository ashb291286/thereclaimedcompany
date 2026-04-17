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
      /** Vercel Blob: URLs are often `https://<storeId>.public.blob.vercel-storage.com/...` */
      {
        protocol: "https",
        hostname: "public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      /** WordPress + site media (apex + any subdomain, e.g. www / cdn). */
      {
        protocol: "https",
        hostname: "thereclaimedcompany.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.thereclaimedcompany.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
