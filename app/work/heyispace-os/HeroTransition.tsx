import CaseNav from "../CaseNav";
import HeroVisual from "./HeroVisual";
import HeroWaves from "./HeroWaves";
import Section01ProjectContext from "./Section01ProjectContext";
import styles from "./page.module.css";

export default function HeroTransition() {
  return (
    <section
      id="section-01-hero"
      className={styles.heroScene}
      aria-label="Heyispace OS 案例：首屏与空间管理工作台"
    >
      {/* 首屏渐变波浪背景（React Bits GradientWaves），随滚动淡出。 */}
      <HeroWaves />
      <CaseNav projectLabel="HEYISPACE OS" />

      <header className={styles.heroCopy}>
        <p className={styles.eyebrow}>CASE STUDY · 2026</p>
        <h1>HEYISPACE OS</h1>
        <p className={styles.heroLead}>
          Heyispace OS 是一套用于管理智能办公空间的 Web 系统。用户可以查看房间和设备、
          <br />
          配置自动化策略、查看运行数据，也可以通过 Agent 查询空间运行情况。
        </p>
        <div className={styles.heroActions}>
          <a className={styles.scrollHint} href="#heyispace-hero-image" aria-label="向下查看项目">
            <span>向下查看项目</span>
            <span className={styles.scrollHintMark} aria-hidden="true">
              <svg className={styles.scrollMouse} viewBox="0 0 18 28" fill="none" aria-hidden="true">
                <rect x="0.75" y="0.75" width="16.5" height="26.5" rx="8.25" ry="8.25" stroke="currentColor" strokeWidth="1.5" />
                <line className={styles.scrollWheelDot} x1="9" y1="6" x2="9" y2="9.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
              <svg className={styles.scrollChevrons} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path className={styles.scrollChevron} d="M1 1.5L6 6L11 1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                <path className={styles.scrollChevron} d="M1 6.5L6 11L11 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </span>
          </a>
        </div>
      </header>
      {/* 主图 + 01 文案 + 三卡是同一块舞台（2026-09-24 收口）：整组一起吸顶、
          一起保持、一起离场。分组吸顶后卡片落位与入场是同一时刻，不再是
          「先出现、再滚一段才落到最终位置」的两段式。吸顶位与是否吸顶由
          HeroVisual 实测后写进 --ho-hero-top / data-ho-stack。 */}
      <div className={styles.heroStageTrack} data-ho-stage-track="true">
        <div className={styles.heroStage} data-ho-stage="true">
          <HeroVisual />
          <Section01ProjectContext />
        </div>
      </div>
    </section>
  );
}
