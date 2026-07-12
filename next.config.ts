import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    PRISMA_GENERATE_SKIP_AUTOINSTALL: "true",
  },
};

export default nextConfig;
