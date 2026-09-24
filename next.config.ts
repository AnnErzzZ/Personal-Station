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
        // 自定义域名 wuzirong.cn 直接吃站点根（域名声明在 public/CNAME），
        // 所以不能再带 /Personal-Station 这个项目页前缀：带了以后域名根下的
        // HTML 会去请求 /Personal-Station/_next/...，在没有该前缀的域名上全 404。
        // 旧地址 annerzzz.github.io/Personal-Station/ 由 GitHub Pages 301 到新域名。
        // 配套约定：NEXT_PUBLIC_BASE_PATH 保持未设置（lib/site-asset.ts 会退化成原样返回）。
        trailingSlash: true,
        images: { unoptimized: true },
        distDir: ".next-pages",
      }
    : {}),
};

export default nextConfig;
