import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.BODEALER_TEST_MODE === "1" ? ".next-test" : ".next",
};

export default nextConfig;
