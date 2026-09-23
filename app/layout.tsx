import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { siteAsset } from "@/lib/site-asset";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "伍子荣 Zirong Wu｜Product Designer",
    template: "%s｜伍子荣 Zirong Wu",
  },
  description:
    "伍子荣（Zirong Wu）的 Product Design / UX/UI 作品集：智能空间、AIoT 与 B 端系统的产品设计、交互与界面落地。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          "--arrow-icon": `url("${siteAsset("/icons/arrow-up-right.svg")}")`,
          "--close-icon": `url("${siteAsset("/icons/18px_xmark.svg")}")`,
        } as CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
