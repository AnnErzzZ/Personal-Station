import type { NextConfig } from "next";

// Next.js 16 blocks cross-origin access to dev resources (for example the
// `/_next/hmr` socket) unless the host is listed here. When that socket is
// blocked, the HTML and CSS still load but client components never hydrate,
// so scroll-driven sections (04/07, 05/07) stay frozen on the LAN URL.
// This only affects `next dev` when the preview is opened from another host.
const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.*.*"],
  ...(process.env.GITHUB_PAGES === "true"
    ? {
        output: "export",
        basePath: "/Personal-Station",
        trailingSlash: true,
        images: { unoptimized: true },
        distDir: ".next-pages",
      }
    : {}),
};

export default nextConfig;
