import HeroName from "./home/HeroName";
import HeroCta from "./home/HeroCta";
import SiteNav from "./home/SiteNav";
import SiteProgress from "./home/story/SiteProgress";
import StoryScrolly from "./home/story/StoryScrolly";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className={styles.home}>
      <SiteNav />
      <main>
        {/* 单一连续滚动叙事：首屏（柴犬互动 + 大标题）→ 正脸交接 → 主视频滚轮驱动
            （履历 / 作品 / 结尾三个关键姿态 + 静态图接管 + 整屏 sticky 停留）。
            Hero 文案作为 heroCopy 槽位传入，柴犬视觉全部在同一个 sticky 舞台上演进。 */}
        <StoryScrolly
          heroCopy={
            <div className={styles.heroInner}>
              <div className={styles.heroMain}>
                <div className={styles.heroTitleBlock}>
                  <p className={styles.heroEyebrow} data-ui-group="hero-eyebrow">
                    Portfolio — 2026 · Guangzhou, China
                  </p>
                  <div data-ui-group="hero-title">
                    <HeroName />
                  </div>
                  <div
                    className={`${styles.heroIntroRow} ${styles.transitionChrome}`}
                    data-ui-group="hero-intro"
                  >
                    <p className={styles.heroIntro}>
                      嗨，我是伍子荣。同时参与产品、UX/UI
                      与落地实现，把复杂规则整理成可理解的系统。
                    </p>
                    <div className={styles.heroCtaRow}>
                      <HeroCta />
                    </div>
                  </div>
                </div>
                <aside
                  className={`${styles.heroAside} ${styles.transitionChrome}`}
                  data-ui-group="hero-aside"
                >
                  <p className={styles.asideHead}>Build with AI.</p>
                  <p className={styles.asideBody}>
                    从需求分析到页面实现，用 AI
                    辅助推进真实项目落地。
                  </p>
                </aside>
              </div>
              <div
                className={`${styles.heroFoot} ${styles.transitionChrome}`}
                data-ui-group="hero-footer"
              >
                <p className={styles.footNote}>
                  从需求分析到上线验收，完整参与产品落地的全过程。
                </p>
                <p className={styles.scrollHint}>
                  <span>Scroll to explore</span>
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
                </p>
                <p className={styles.footWatch}>
                  Hello, woof.
                  <span>移动鼠标，他正看着你的光标。</span>
                </p>
              </div>
            </div>
          }
        />
      </main>
      {/* 全站阅读进度条：一条连续时间轴贯穿 Hero → 履历 → 作品 → 结尾，
          fixed 钉在视口底部同一位置，只读滚动状态（见 SiteProgress.tsx）。 */}
      <SiteProgress />
    </div>
  );
}
