"use client";

import Image from "@/components/SiteImage";
import localFont from "next/font/local";
import { useId, type CSSProperties } from "react";
import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { usePrototypeExperience } from "./PrototypeExperience";
import styles from "./operations-hero.module.css";

const operationsTitle = localFont({
  src: "./fonts/AlimamaShuHeiTi-Bold.ttf",
  weight: "700",
  style: "normal",
  display: "swap",
  fallback: ["Noto Sans SC", "Microsoft YaHei", "sans-serif"],
  adjustFontFallback: false,
});

const backgroundScreens = [
  { file: "priority", width: 2540, height: 1240 },
  { file: "contribution", width: 2536, height: 1448 },
  { file: "history", width: 2536, height: 1084 },
  { file: "pool", width: 2536, height: 1007 },
];

export default function OperationsHero() {
  const { open } = usePrototypeExperience();
  const glowFilter = `operations-accent-${useId().replace(/:/g, "")}`;
  return (
    <section className={styles.hero} id="overview" aria-labelledby="overview-title" data-case-layout="cover" data-operations-dark>
      <div className={styles.background} aria-hidden="true">
        <svg width="0" height="0" className={styles.filterDefinitions} focusable="false">
          <defs>
            <filter id={glowFilter} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
              {/* Only chromatic interface pixels enter the glow layer. */}
              <feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 4 -2 -2 0 -.4" result="redMask" />
              <feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -2 4 -2 0 -.4" result="greenMask" />
              <feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -2 -2 4 0 -.4" result="blueMask" />
              <feMerge result="accentMask"><feMergeNode in="redMask" /><feMergeNode in="greenMask" /><feMergeNode in="blueMask" /></feMerge>
              <feColorMatrix in="SourceGraphic" type="saturate" values="2.8" result="saturated" />
              <feComponentTransfer in="saturated" result="vivid">
                <feFuncR type="gamma" amplitude="1.15" exponent=".65" />
                <feFuncG type="gamma" amplitude="1.15" exponent=".65" />
                <feFuncB type="gamma" amplitude="1.15" exponent=".65" />
              </feComponentTransfer>
              <feComposite in="vivid" in2="accentMask" operator="in" result="accents" />
              <feGaussianBlur in="accents" stdDeviation="1.2" result="core" />
              <feGaussianBlur in="accents" stdDeviation="8" result="nearGlow" />
              <feGaussianBlur in="accents" stdDeviation="24" result="wideGlow" />
              <feComponentTransfer in="nearGlow" result="bloom"><feFuncA type="linear" slope="1.6" /></feComponentTransfer>
              <feMerge><feMergeNode in="wideGlow" /><feMergeNode in="bloom" /><feMergeNode in="core" /></feMerge>
            </filter>
          </defs>
        </svg>
        <div className={styles.interfacePlane} data-operations-background>
          {backgroundScreens.map(({ file, width, height }, index) => (
            <div className={styles.interfaceScreen} key={file} data-background-screen={file}
              style={{ "--screen-delay": `${index === 0 ? 0 : index * 6 - 24}s` } as CSSProperties}>
              <Image
                className={styles.interfaceBase}
                src={`/cases/operations-platform/previews/${file}.png`}
                alt=""
                width={width}
                height={height}
                loading="eager"
                unoptimized
                sizes="(max-width: 640px) 1600px, 185vw"
              />
              <Image
                className={styles.interfaceGlow}
                style={{ filter: `url(#${glowFilter})` }}
                data-glow-layer={file}
                src={`/cases/operations-platform/previews/${file}.png`}
                alt=""
                width={width}
                height={height}
                loading="eager"
                unoptimized
                sizes="(max-width: 640px) 1600px, 185vw"
              />
            </div>
          ))}
        </div>
        <div className={styles.topMask} />
        <div className={styles.bottomMask} />
      </div>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.category}>Web 后台 · UI 与交互设计</p>
          <h1 id="overview-title" className={`${styles.title} ${operationsTitle.className}`}>合一运维平台</h1>
          <p className={styles.description}>面向智能空间运维团队的 Web 后台。我从 0 到 1 负责整体 UI 与交互设计，覆盖异常看板、工单、项目管理和权限配置。本案例重点展示高密度列表、详情层级、表单操作与状态反馈的设计。</p>
          <div className={styles.actions}>
            <a href="#background">查看界面设计<IconArrowRight size={18} /></a>
            <button type="button" data-open-prototype="work-orders" onClick={() => open("work-orders")}>体验工单流程<IconArrowUpRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
