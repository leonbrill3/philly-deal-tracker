import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this project (it lives under the home dir).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
