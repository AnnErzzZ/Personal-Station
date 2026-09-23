"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./case-nav.module.css";

type CaseNavProps = {
  /** 面包屑里的当前案例名（strong 部分，如 "HEYISPACE OS"）。 */
  projectLabel: string;
  /**
   * 深色首屏选择器：命中元素的底边还压在导航线以下时，导航切到
   * 深色配色（implementation-assistant 的整屏深色 Hero 用）。
   * 案例页整体浅色时不传。
   */
  darkHeroSelector?: string;
};

/** 与 case-nav.module.css 的 .inner height 保持一致（720 以下缩到 56px，取大值）。 */
const NAV_HEIGHT = 62;

/**
 * 案例页顶部导航 —— 与首页 SiteNav 同一套版式契约：
 * fixed 吸顶 + 毛玻璃、三栏（品牌 / 面包屑 / 身份）、62px 高、同字体档。
 *
 * 与首页的差异只有两点（见 case-nav.module.css 顶部说明）：
 *   · 案例页没有首页的 Hero 隐藏态，导航常驻可见；
 *   · 深色首屏由本组件滚动检测写 data-dark（首页由 SiteNav 自己的状态写）。
 */
export default function CaseNav({
  projectLabel,
  darkHeroSelector,
}: CaseNavProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!darkHeroSelector) return;
    let raf = 0;
    const evaluate = () => {
      raf = 0;
      const hero = document.querySelector<HTMLElement>(darkHeroSelector);
      const next = hero
        ? hero.getBoundingClientRect().bottom > NAV_HEIGHT
        : false;
      setDark((current) => (current === next ? current : next));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [darkHeroSelector]);

  return (
    <header className={styles.nav} data-ho-case-nav="true" data-dark={dark ? "true" : "false"}>
      <div className={styles.inner}>
        <Link className={styles.mark} href="/">
          Zirong Wu.
        </Link>
        <p className={styles.crumb}>
          <Link href="/">作品</Link>
          <span aria-hidden="true">/</span>
          <strong>{projectLabel}</strong>
        </p>
        <p className={styles.identity}>
          Product Designer
          <span className={styles.identitySub}>UX / UI · Guangzhou</span>
        </p>
      </div>
    </header>
  );
}
