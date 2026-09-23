import RevealOnView from "./RevealOnView";
import styles from "./page.module.css";

/**
 * 02 / 12 项目背景（2026-09-23 起独立成节）。
 *
 * 原本住在 Hero sticky scene 的下半区、由滚动进度分层进入；MacbookScroll
 * 接管首屏舞台后，本节改为普通文档流章节，紧跟 macStage 裁切线之后，
 * 入场交给 RevealOnView（进入视口触发一次，样式在 .contextReveal）。
 * 内容层不变：三张左对齐卡片（产品 / 用户与场景 / 我的角色），
 * 排版对齐 Apple 环境页的价值观卡：顶部图标位 + 大间距 + 标题 + 正文。
 * 图标（2026-09-23 三版定稿）：统一线性语言——24 网格 / 1.6px 圆头描边 /
 * 双色（主色 currentColor + 浅色 var(--icon-soft)），无实心元素；设计稿见
 * Ardot「02 章卡片图标 · 复盘风格重绘」，一卡一色（紫 / 青 / 品红）：
 *   产品       = 2×2 空间网格，右下一格主色描边（被管理的活跃空间）；
 *   用户与场景 = 描边人形居中 + 两侧浅色环境弧（人物置身场景之中）；
 *   我的角色   = 线性定位钉（主导地图编辑器 / 我在项目中的位置）。
 * 徽章为淡彩圆角方（tint 底 + 主色图形），hover 浮现品牌色圆片白图形，
 * 交互样式在 page.module.css，色板由各卡内联 CSS 变量注入。
 */
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

export default function Section01ProjectContext() {
  return (
    <RevealOnView className={styles.contextReveal}>
      <div
        className={styles.contextStandalone}
        id="section-02-context"
        data-ho-context="true"
      >
        <div className={styles.contextInner}>
          <h2 className={styles.contextTitle} data-ho-context-part="title">
            空间管理工作台
          </h2>

          <div className={styles.contextFacts} data-ho-context-part="facts">
            {contextCards.map((card) => (
              <article className={styles.contextCard} key={card.title}>
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
                <h3 className={styles.contextCardTitle}>{card.title}</h3>
                <p className={styles.contextCardBody}>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </RevealOnView>
  );
}
