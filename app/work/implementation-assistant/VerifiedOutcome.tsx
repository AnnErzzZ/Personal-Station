import EntranceSequence from "./EntranceSequence";
import Sparkles from "./Sparkles";
import styles from "./verified-outcome.module.css";

export default function VerifiedOutcome() {
  return (
    <section className={styles.section} aria-labelledby="verified-outcome-title">
      <EntranceSequence
        fillWidth
        manualAtDesktop
        name="section-07-outcome"
        selfVariant="content"
      >
        <div className={styles.stage}>
        <header className={styles.header}>
          <div
            className={styles.meta}
            data-entrance-item
            data-entrance-step="identity"
            data-entrance-variant="opacity"
          >
            <span>Implementation Assistant</span>
            <span>07/08</span>
          </div>
          <h2
            className={styles.title}
            data-entrance-item
            data-entrance-step="title"
            data-entrance-variant="opacity"
            id="verified-outcome-title"
          >
            真实任务中的表现
          </h2>
          <p
            className={styles.body}
            data-entrance-item
            data-entrance-step="support"
            data-entrance-variant="opacity"
          >
            2026 年 5 月 30
            日，我用新版实施助手在一个标准房间的配置演示中走完全部流程，现场用时约 <span className={styles.keepTogether}>7 分钟</span>，完成了 1 个网关雷达、2 个传感器、2 个开关设备和 1 个空调面板的配置。
          </p>
        </header>

        <div
          className={styles.figureStage}
          data-entrance-item
          data-entrance-step="primary"
          data-entrance-variant="opacity"
        >
          <span className={styles.sparkLines} aria-hidden="true">
            <span className={styles.sparkLineWideGlow} />
            <span className={styles.sparkLineWide} />
            <span className={styles.sparkLineNarrowGlow} />
            <span className={styles.sparkLineNarrow} />
          </span>
          <Sparkles
            className={styles.sparkles}
            density={1800}
            minSize={0.5}
            maxSize={1.2}
          />
          <p className={styles.figure}>
            约 <span className={styles.figureNumber}>7</span> 分钟
          </p>
          <p className={styles.figureNote}>
            相比原先每间房约 15–30 分钟的调试时间，调试时长缩短约 53%–77%
          </p>
        </div>

        <div
          className={styles.footnote}
          data-entrance-item
          data-entrance-step="secondary"
          data-entrance-variant="opacity"
        >
          <p>这次重构覆盖的是实施任务本身。</p>
          <p>
            我把原本依赖经验记忆的实施过程，逐步转成了产品里的前置条件、任务状态、异常反馈和连续操作，再通过规范与知识资料把这些判断沉淀下来。
          </p>
        </div>
      </div>
      </EntranceSequence>
    </section>
  );
}
