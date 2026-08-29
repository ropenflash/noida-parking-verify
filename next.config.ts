import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "xlsx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lwarfsmduwxqhhfbnkdf.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
