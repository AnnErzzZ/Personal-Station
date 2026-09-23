"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { SITE_SECTIONS, SITE_TOTAL_VH } from "./story-config";
import styles from "./site-progress.module.css";

/**
 * 全站阅读进度条（Site Progress）—— 一条贯穿整个作品集的连续时间轴。
 *
 * 它不是任何一个 Section 的局部进度：globalProgress = 叙事容器已滚距离 / 总可滚距离，
 * 从网站最上方（0）到最下方（1）持续增加，反向滚动连续回退，永不归零。
 * 每个 Section 只是这条轴上的一个节点（细竖线 tick，位置 = startVh / 总长，
 * 映射真实滚动区间而非等分）；当前阅读位置是 5px 圆点，与节点严格区分。
 *
 * 组件只有一个 DOM 实例：position: fixed 钉在视口底部同一位置（左右对齐
 * --page-padding-x），Hero / 履历 / 作品 / 结尾共用 —— 换幕时轨道不消失、
 * 不重载、不跳动，只更新左侧章节信息与右侧页码（120ms 轻淡入）。
 *
 * 只读滚动状态，不写回任何滚动 / 视频行为；几何只在 resize 变化，
 * 进度在 scroll 的 rAF 节流里现算，与引擎（StoryScrolly）各自独立。
 */

/** 各 Section 底部条带的「深色区右缘」（帧归一化 x）。
 *  由 `node artifacts/tmp/strip-lum.mjs` 实测：hero 站姿 ≈0.78、resume ≈0.86、
 *  work 坐姿最宽 ≈0.92、ending 坠落构图整条底部全白（永不反白）。
 *  右侧页码块压进深色区就反白（--dark-subtle，与 chromeAside 同一套约定）。 */
const DARK_RIGHT: Record<string, number> = {
  hero: 0.8,
  about: 0.86,
  work: 0.93,
  // ending 坠落构图整条底部全白：不存在深色区 → 右缘 0（页码永不压进深色区）
  contact: 0,
};

const MARKER_EPS = 1e-4;
const fractionOf = (section: (typeof SITE_SECTIONS)[number]) =>
  section.startVh / SITE_TOTAL_VH;

export default function SiteProgress() {
  const rootRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const tickRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const meta = metaRef.current;
    const ticks = tickRefs.current.filter(Boolean) as HTMLElement[];
    const container = document.querySelector("[data-story-container]");

    let raf = 0;
    let lastP = -1;
    let lastSection = "";
    let lastTickMask = "";
    let lastOnDark: string | null = null;

    /**
     * 运行时节点的几何：StoryScrolly 会按履历内容真实高度动态改叙事容器的高
     * （Biography 段长 = intro + 履历行程×倍率 + end），所以 tick 位置与
     * 「当前 Section」判定不能依赖 story-config 的编译期常量 ——
     * 容器几何或各 Section 的 data-scroll-start-vh 一变就重算（模块常量只作兜底）。
     */
    let fractions: number[] = SITE_SECTIONS.map(fractionOf);
    let lastGeometryKey = "";
    const syncGeometry = (containerHeight: number, vh: number) => {
      const key = `${Math.round(containerHeight)}x${Math.round(vh)}`;
      if (key === lastGeometryKey) return;
      lastGeometryKey = key;
      let totalVh = SITE_TOTAL_VH;
      if (vh > 0 && containerHeight > vh) {
        totalVh = ((containerHeight - vh) / vh) * 100;
      }
      fractions = SITE_SECTIONS.map((section, index) => {
        if (index === 0) return 0;
        const el = container?.querySelector(`[data-layer="${section.id}"]`);
        const attr = el?.getAttribute("data-scroll-start-vh");
        const startVh = attr ? Number(attr) : section.startVh;
        return totalVh > 0 ? startVh / totalVh : 0;
      });
      ticks.forEach((tick, index) => {
        if (index < SITE_SECTIONS.length) {
          tick.style.left = `${(fractions[index] * 100).toFixed(3)}%`;
        }
      });
    };

    const evaluate = () => {
      raf = 0;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // ---- 全站进度：叙事容器的滚动占比（clamp 到 0..1）----
      let p = 0;
      if (container) {
        const rect = container.getBoundingClientRect();
        const total = rect.height - vh;
        p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        syncGeometry(rect.height, vh);
      } else {
        const doc = document.documentElement;
        const total = doc.scrollHeight - vh;
        p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      }
      // 量化到 1/2000，避免浮点尾差引发的无谓写样式
      const q = Math.round(p * 2000) / 2000;

      // 当前 Section = 最后一个起点 ≤ 进度的节点
      let current = SITE_SECTIONS[0];
      for (let i = 0; i < SITE_SECTIONS.length; i += 1) {
        if (q + MARKER_EPS >= fractions[i]) current = SITE_SECTIONS[i];
      }

      if (q !== lastP) {
        lastP = q;
        root.style.setProperty("--sp-progress", q.toFixed(4));
      }
      if (current.id !== lastSection) {
        lastSection = current.id;
        root.dataset.section = current.id;
      }

      // tick 状态：upcoming / passed / current（当前 Section 的节点保持最深）
      // 注意必须 join("")：数组直接 + 字符串会先逗号 toString，mask 全部错位
      const mask = SITE_SECTIONS.map((section, index) => {
        const passed = q + MARKER_EPS >= fractions[index];
        return current.id === section.id ? "c" : passed ? "p" : "u";
      }).join("") + (q >= 1 - MARKER_EPS ? "p" : "u");
      if (mask !== lastTickMask) {
        lastTickMask = mask;
        ticks.forEach((tick, i) => {
          const state = mask[i] === "c" ? "current" : mask[i] === "p" ? "passed" : "upcoming";
          if (tick.dataset.state !== state) tick.dataset.state = state;
        });
      }

      // 反白判定：右侧页码块左缘压进当前 Section 的深色区（几何只在 resize 变，
      // 但深色区随 Section 变，所以放进同一个 evaluate，靠 dataset 去重写）
      if (meta) {
        const box = Math.max(vw, (vh * 16) / 9);
        const edge = DARK_RIGHT[current.id] * box - (box - vw) / 2;
        const onDark = meta.getBoundingClientRect().left < edge - 12;
        const value = onDark ? "true" : "false";
        if (lastOnDark !== value) {
          lastOnDark = value;
          root.dataset.spOnDark = value;
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // 叙事容器高度变化（Biography 段长按内容重算）→ 重算节点位置。
    // evaluate 自带几何 key 去重，高度没变的回调零成本。
    let containerObserver: ResizeObserver | null = null;
    if (container) {
      containerObserver = new ResizeObserver(onScroll);
      containerObserver.observe(container);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      containerObserver?.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const totalLabel = String(SITE_SECTIONS.length).padStart(2, "0");

  return (
    <div
      ref={rootRef}
      className={styles.siteProgress}
      data-section="hero"
      data-sp-on-dark="false"
      data-site-progress=""
      aria-hidden="true"
      style={{ "--sp-progress": "0" } as CSSProperties}
    >
      <div className={styles.info} data-sp-info="">
        {SITE_SECTIONS.map((section) => (
          <p key={section.id} className={styles.infoItem} data-item={section.id}>
            <span className={styles.infoIndex}>{section.index}</span>
            <span className={styles.infoSep} aria-hidden="true">
              /
            </span>
            <span className={styles.infoLabel}>{section.label}</span>
            <span className={styles.infoZh}>{section.labelZh}</span>
          </p>
        ))}
      </div>

      <div className={styles.track} data-sp-track="">
        <span className={styles.trackLine} />
        <span className={styles.trackFill} data-sp-fill="" />
        {SITE_SECTIONS.map((section, i) => (
          <i
            key={section.id}
            ref={(el) => {
              tickRefs.current[i] = el;
            }}
            className={styles.tick}
            data-tick={section.id}
            data-state={i === 0 ? "current" : "upcoming"}
            style={{ left: `${fractionOf(section) * 100}%` }}
          />
        ))}
        <i
          ref={(el) => {
            tickRefs.current[SITE_SECTIONS.length] = el;
          }}
          className={styles.tick}
          data-tick="end"
          data-state="upcoming"
          style={{ left: "100%" }}
        />
        <span className={styles.dot} data-sp-dot="" />
      </div>

      <div className={styles.meta} ref={metaRef} data-sp-meta="">
        {SITE_SECTIONS.map((section) => (
          <p key={section.id} className={styles.metaItem} data-item={section.id}>
            <span className={styles.metaPage}>
              {section.index} / {totalLabel}
            </span>
            <span className={styles.metaHint}>
              {section.id === SITE_SECTIONS[SITE_SECTIONS.length - 1].id ? "到底了" : "往下滑动"}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
