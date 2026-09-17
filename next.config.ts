import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/assistant", destination: "/", permanent: true }];
  },
};

export default nextConfig;
