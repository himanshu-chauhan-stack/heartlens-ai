import type { NextConfig } from "next";
const isStatic = process.env.GITHUB_PAGES === "true";
const basePath = isStatic
  ? (process.env.NEXT_PUBLIC_BASE_PATH || "/heartlens-ai").replace(/\/$/, "")
  : "";
const nextConfig: NextConfig = {
  distDir: isStatic ? ".next-static" : ".next",
  images: { unoptimized: true },
  ...(isStatic
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        env: {
          NEXT_PUBLIC_BASE_PATH: basePath,
          NEXT_PUBLIC_DIRECT_API: "true",
        },
      }
    : { output: "standalone" }),
};
export default nextConfig;
