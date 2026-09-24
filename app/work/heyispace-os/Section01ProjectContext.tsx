"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

/** Project context cards revealed when the section enters the viewport. */
type ContextCard = {
  title: string;
  body: string;
  /** 徽章主色（hover 圆片 / 图标主描边）。 */
  accent: string;
  /** 徽章淡彩底。 */
  tint: string;
  /** 图标浅色描边。 */
  soft: string;
  icon: React.ReactNode;
};

const contextCards: ContextCard[] = [
  {
    title: "产品",
    body: "Heyispace OS 是一套智能空间管理 Web 系统。用户可以在这里看空间和设备、配自动化策略、查运行数据，也可以直接问 Agent。",
    accent: "#6E62E5",
    tint: "#ECEAFB",
    soft: "#A79BF2",
    icon: (
      // 产品：2×2 空间网格，右下一格主色描边 = 系统正在管理的活跃空间。
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3.75" y="3.75" width="7" height="7" rx="1.75" stroke="var(--icon-soft)" strokeWidth={1.6} />
        <rect x="13.25" y="3.75" width="7" height="7" rx="1.75" stroke="var(--icon-soft)" strokeWidth={1.6} />
        <rect x="3.75" y="13.25" width="7" height="7" rx="1.75" stroke="var(--icon-soft)" strokeWidth={1.6} />
        <rect x="13.25" y="13.25" width="7" height="7" rx="1.75" stroke="currentColor" strokeWidth={1.6} />
      </svg>
    ),
  },
  {
    title: "用户与场景",
    body: "空间运营、运维、管理及内部业务人员会在系统中查看状态、配置策略、分析运行数据和处理问题。",
    accent: "#2BA8A0",
    tint: "#E3F4F1",
    soft: "#8AD4CC",
    icon: (
      // 用户与场景：描边人形居中，两侧浅色环境弧示意「置身场景之中」。
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8.9" r="3" stroke="currentColor" strokeWidth={1.6} />
        <path d="M6.5 19.75a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M4.35 6.9a8.1 8.1 0 0 0 0 8.2" stroke="var(--icon-soft)" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M19.65 6.9a8.1 8.1 0 0 1 0 8.2" stroke="var(--icon-soft)" strokeWidth={1.6} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "我的角色",
    body: "我主导地图编辑器的功能结构、编辑流程和 UX / UI 重构，也主导 Agent 的查询、追问与回答结构。",
    accent: "#B655E8",
    tint: "#F6EBFA",
    soft: "#D9A6F2",
    icon: (
      // 我的角色：线性定位钉——主导地图编辑器，也是「我的定位」的双关。
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 4.4a5.4 5.4 0 0 1 5.4 5.4c0 4-5.4 9.3-5.4 9.3S6.6 13.8 6.6 9.8A5.4 5.4 0 0 1 12 4.4Z"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9.8" r="1.6" stroke="currentColor" strokeWidth={1.6} />
      </svg>
    ),
  },
];

const renderCardBody = (card: ContextCard) => (
  <>
    {/* 标题行：标题贴左、徽章贴右，两端对齐；正文在行下方。 */}
    <div className={styles.contextCardHead}>
      <h3 className={styles.contextCardTitle}>{card.title}</h3>
      <span
        className={styles.contextCardIcon}
        aria-hidden="true"
        data-ho-context-icon="true"
        data-ho-context-icon-role={card.title}
        style={
          {
            "--badge-accent": card.accent,
            "--badge-tint": card.tint,
            "--icon-soft": card.soft,
          } as React.CSSProperties
        }
      >
        {card.icon}
      </span>
    </div>
    <p className={styles.contextCardBody}>{card.body}</p>
  </>
);

export default function Section01ProjectContext() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  /* 卡片组上缘进入视口下 8% 线即点亮，双向可逆。
     旧断点 releaseAt + 64（等主图 sticky 释放后再入场）是 MacBook 场景
     的编排遗留：主图改纯截图吸顶后，再等释放就会「卡片一出来主图已被
     顶出窗口」。现在主图吸顶期间卡片在其下方浮现，两者天然同屏。 */
  useEffect(() => {
    const node = rootRef.current;
    const cards = node?.querySelector<HTMLElement>('[data-ho-context-part="facts"]');
    if (!node || !cards) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setInView(cards.getBoundingClientRect().top <= window.innerHeight * 0.92);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.contextScene}
      id="section-02-context"
      data-ho-context="true"
      data-entered={inView ? "true" : "false"}
    >
      <h2 className={styles.contextTitle} data-ho-context-part="title">
        空间管理工作台
      </h2>

      <div className={styles.contextFacts} data-ho-context-part="facts">
        {contextCards.map((card) => (
          <article className={styles.contextCard} key={card.title}>
            {renderCardBody(card)}
          </article>
        ))}
      </div>
    </div>
  );
}
