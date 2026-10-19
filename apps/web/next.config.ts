import type { NextConfig } from "next";
const isStatic = process.env.GITHUB_PAGES === "true";
const basePath = isStatic
  ? (process.env.NEXT_PUBLIC_BASE_PATH || "/heartlens-ai").replace(/\/$/, "")
  : "";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(!isStatic ? {
    async headers() {
      return [{ source: "/:path*", headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      ] }];
    },
  } : {}),
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
