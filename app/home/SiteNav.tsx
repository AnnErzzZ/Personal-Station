"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import PillNav, { type PillNavItem } from "./PillNav";
import { scrollToSection, sectionScrollTarget } from "./story/scroll-to-section";
import { SITE_SECTIONS } from "./story/story-config";
import styles from "./site-nav.module.css";

/* 导航项从全站 Section 配置派生（spec：导航与 SiteProgress 共用同一份配置）——
   SITE_SECTIONS 里带 navLabel 的才是导航入口（hero 没有 navLabel，
   由左上角品牌名负责回顶），顺序即配置顺序，不再单独硬编码。 */
const links = SITE_SECTIONS.flatMap((section) =>
  section.navLabel
    ? [{ id: section.id, label: section.navLabel, href: `#${section.id}` }]
    : [],
);

const pillItems: readonly PillNavItem[] = links.map(({ label, href }) => ({
  label,
  href,
}));

/**
 * 顶部导航（参考作品集 Hero Banner 的顶部信息区）：
 * 左侧品牌名、中间模块入口、右侧身份说明一行。
 * 自然滚动版：Hero 上是透明轻量态（mode="hero"），滚过首屏后变成悬浮导航条；
 * 高亮项与跳转都按各叙事 Section 的「可读阶段起点」（hold 起点）计算。
 */
export default function SiteNav() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const evaluate = () => {
      raf = 0;
      const hero = document.getElementById("top");
      const story = document.querySelector<HTMLElement>("[data-story-container]");
      const nextVisible = hero
        ? hero.dataset.state === "off" && story?.dataset.storyPhase !== "hero"
        : true;
      setVisible((current) => (current === nextVisible ? current : nextVisible));

      // 以视口 45% 高度线为判据：可读阶段起点越过这条线即视为进入该 Section。
      const pivot = window.scrollY + window.innerHeight * 0.45;
      let next: string | null = null;
      for (const link of links) {
        const target = sectionScrollTarget(link.id);
        if (target !== null && pivot >= target) next = link.id;
      }
      setActive((current) => (current === next ? current : next));
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    const hero = document.getElementById("top");
    const heroStateObserver = new MutationObserver(onScroll);
    if (hero) {
      heroStateObserver.observe(hero, {
        attributes: true,
        attributeFilter: ["data-state"],
      });
    }
    const story = document.querySelector<HTMLElement>("[data-story-container]");
    if (story) {
      heroStateObserver.observe(story, {
        attributes: true,
        attributeFilter: ["data-story-phase"],
      });
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      heroStateObserver.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const handleNavigate = useCallback(
    (item: PillNavItem, event: ReactMouseEvent<HTMLAnchorElement>) => {
      const target = item.href.startsWith("#") ? item.href.slice(1) : null;
      if (!target) return;
      event.preventDefault();
      scrollToSection(target);
    },
    [],
  );

  return (
    <header
      className={styles.nav}
      data-mode={visible ? "bar" : "hero"}
      data-visible={visible}
      data-dark="false"
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className={styles.inner}>
        <a
          className={styles.mark}
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("top");
          }}
        >
          Zirong Wu.
        </a>
        <div className={styles.pillSlot}>
          {visible ? (
            <PillNav
              items={pillItems}
              activeHref={active ? `#${active}` : undefined}
              onNavigate={handleNavigate}
              ease="power2.out"
              baseColor="#111113"
              pillColor="#ffffff"
              hoveredPillTextColor="#ffffff"
              pillTextColor="#111113"
            />
          ) : null}
        </div>
        <p className={styles.identity}>
          Product Designer
          <span className={styles.identitySub}>UX / UI · Guangzhou</span>
        </p>
      </div>
    </header>
  );
}
