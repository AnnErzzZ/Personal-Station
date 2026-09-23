import { MacbookScroll } from "@/components/ui/macbook-scroll";
import { siteAsset } from "@/lib/site-asset";

import CaseNav from "../CaseNav";
import Section01ProjectContext from "./Section01ProjectContext";
import styles from "./page.module.css";

/**
 * 01 Hero → MacBook Scroll → 02 Project Context（2026-09-23 重构）。
 *
 * 旧的 310vh sticky 场景（CSS scroll-driven 动画 + hero-transition.ts
 * 进度映射：文案分层退出 → 倾斜截图回正 → 背景分层入场）整体下线，
 * 舞台效果由 Aceternity 的 MacbookScroll 接管：
 *
 *   · 首屏 = 导航（fixed 吸顶，全站统一版式 CaseNav）+ Hero 文案 + 合上的
 *     MacBook（stage wrapper 整体放大 1.18 并下沉，键盘约 60% 被视口底部
 *     裁掉）；
 *   · 滚动时文案随进度淡出上移，屏幕从 fold 态开到正视、放大，
 *     展示 agent.png 主截图（2880×2048，屏幕 45:32 同比例不裁边）；
 *   · 行程结束段 translate 把整机下压，被 macStage 的 overflow 裁掉，
 *     项目背景节随后从下方滚入 —— 动画与 02 章的衔接就在这条裁切线上。
 *
 * Hero 文案作为 MacbookScroll 的 title 插槽传入，淡出节奏由组件内置的
 * textOpacity / textTransform 驱动（progress 0–0.2/0–0.3），不再自建 ramp。
 * MacbookScroll 的 Tailwind 工具类由 macbook-scroll.tailwind.css 定向生成。
 */
export default function HeroTransition() {
  return (
    <section
      id="section-01-hero"
      className={styles.heroScene}
      aria-label="Heyispace OS 案例：首屏与项目背景"
    >
      {/* 顶部导航：全站统一版式（app/work/CaseNav），fixed 吸顶常驻，
          与首页 SiteNav 同一套三栏契约。heroScene 的 padding-top 补回
          旧 sticky 导航占掉的流内高度，MacBook 构图不动。 */}
      <CaseNav projectLabel="HEYISPACE OS" />

      <div className={styles.macStage}>
        <MacbookScroll
          title={
            <header className={styles.heroCopy}>
              <p className={styles.eyebrow}>CASE STUDY · 2026</p>
              <h1>HEYISPACE OS</h1>
              <p className={styles.heroLead}>
                Heyispace OS 是一套用于管理智能办公空间的 Web 系统。用户可以查看房间和设备、
                <br />
                配置自动化策略、查看运行数据，也可以通过 Agent 查询空间运行情况。
              </p>
              <div className={styles.heroActions}>
                {/* 滚动提示与首页首屏同款（app/page.tsx .scrollHint）：
                    鼠标滚轮 + 双箭头动画，图形走 currentColor。
                    这里保留链接行为：点击锚到新 03 Users & Tasks 章
                    （旧 02 产品结构章已于 2026-09-22 下线）。 */}
                <a className={styles.scrollHint} href="#section-03-users" aria-label="向下查看项目">
                  <span>向下查看项目</span>
                  <span className={styles.scrollHintMark} aria-hidden="true">
                    <svg
                      className={styles.scrollMouse}
                      viewBox="0 0 18 28"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="0.75"
                        y="0.75"
                        width="16.5"
                        height="26.5"
                        rx="8.25"
                        ry="8.25"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <line
                        className={styles.scrollWheelDot}
                        x1="9"
                        y1="6"
                        x2="9"
                        y2="9.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <svg
                      className={styles.scrollChevrons}
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        className={styles.scrollChevron}
                        d="M1 1.5L6 6L11 1.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                      <path
                        className={styles.scrollChevron}
                        d="M1 6.5L6 11L11 6.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </span>
                </a>
              </div>
            </header>
          }
          src={siteAsset("/cases/heyispace-os/hero/agent.png")}
          showGradient={false}
        />
      </div>

      <Section01ProjectContext />
    </section>
  );
}
