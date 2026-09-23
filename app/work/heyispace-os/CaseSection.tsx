import type { CSSProperties, ReactNode } from "react";

import styles from "./sections.module.css";

const cx = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

type ChapterProps = {
  id: string;
  variant?: "light" | "dark";
  className?: string;
  children: ReactNode;
};

/** 章节外壳：统一内容轴线与章节边界，构图由各章自己的 class 决定。 */
export function Chapter({
  id,
  variant = "light",
  className,
  children,
}: ChapterProps) {
  return (
    <section
      id={id}
      className={cx(
        styles.chapter,
        variant === "dark" ? styles.chapterDark : styles.chapterLight,
        className,
      )}
    >
      <div className={styles.inner}>{children}</div>
    </section>
  );
}

type SectionHeaderProps = {
  index: string;
  /** 章节总数。HEYISPACE OS 已统一为 12 章，允许显式传入以便断言。 */
  total?: string;
  title: string;
  intro?: ReactNode;
  className?: string;
};

export function SectionHeader({
  index,
  total,
  title,
  intro,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cx(styles.header, className)}>
      {/* 降噪轮（2026-09-23）：删去中段英文定位标签——它与中文标题完全
          同义（如 Users & Tasks ↔ 用户与核心任务），只增加一行视觉噪音。
          meta 保留「品牌 + 编号」两段。 */}
      <p className={styles.meta}>
        <span>Heyispace OS</span>
        <span className={styles.metaIndex}>{index} / {total ?? "12"}</span>
      </p>
      <h2 className={styles.title}>{title}</h2>
      {intro ? <p className={styles.intro}>{intro}</p> : null}
    </header>
  );
}

type EvidenceStageProps = {
  label: string;
  hint?: string;
  height?: number;
  className?: string;
  children?: ReactNode;
};

/** 证据舞台：真实素材到位前使用结构占位，不绘制假界面。 */
export function EvidenceStage({
  label,
  hint,
  height,
  className,
  children,
}: EvidenceStageProps) {
  return (
    <figure
      className={cx(styles.stage, className)}
      style={
        height
          ? ({ "--cs-stage-height": `${height}px` } as CSSProperties)
          : undefined
      }
    >
      {children ? <div className={styles.stageContent}>{children}</div> : null}
      <figcaption
        className={cx(
          styles.stageTag,
          children ? styles.stageTagCorner : styles.stageTagCenter,
        )}
      >
        <span className={styles.stageLabel}>{label}</span>
        {hint ? <span className={styles.stageHint}>{hint}</span> : null}
      </figcaption>
    </figure>
  );
}

/** 小型证据占位，用于章节内需要逐条说明的设计判断。 */
export function EvidenceSlot({ children }: { children: ReactNode }) {
  return <p className={styles.slot}>{children}</p>;
}

export type DesignDecision = {
  index: string;
  /** 判断本身，一句话说清我做了什么。 */
  title: string;
  /** 当时的约束 + 我的选择 + 为什么，2–3 行以内。 */
  body: string;
  /** 可选的证据位文案，渲染成与 03 章 EvidenceSlot 同款的虚线占位。 */
  evidence?: string;
};

type MyDecisionsProps = {
  /** 区块标签，默认「我的判断」。 */
  label?: string;
  /** 这一屏我在解决什么。每章写自己的标题，不要读成同一块模板。 */
  title: string;
  items: readonly DesignDecision[];
  className?: string;
  /**
   * 形态：`columns` 是 03 章定下的统一形态（贯穿顶线 + 竖分隔列 +
   * mono 序号），`list` 是窄阅读列。默认 `columns`；02 是深色章，
   * 暂保留 `list`（见 docs/cases/heyispace-os.md §C）。
   */
  variant?: "columns" | "list";
};

/**
 * 我的判断：作品集每一章都要能读到「我做了什么、为什么这么做」。
 *
 * `columns`（默认）：与 03 章「Agent 回答结构里的三个判断」同一形态 ——
 * 头部 + 一条贯穿的顶部横线 + 横向列，列间竖细线，每列序号 + 标题 + 正文。
 * 列数随条目数走（03 三列、04 四列、05/06 两列）。
 */
export function MyDecisions({
  label = "我的判断",
  title,
  items,
  className,
  variant = "columns",
}: MyDecisionsProps) {
  if (variant === "list") {
    return (
      <section
        className={cx(styles.decisions, className)}
        data-case-decisions="true"
      >
        <p className={styles.blockLabel}>{label}</p>
        <h3 className={styles.blockTitle}>{title}</h3>
        <ol className={styles.decisionList}>
          {items.map((item) => (
            <li
              className={styles.decisionItem}
              data-case-decision
              key={item.index}
            >
              <span className={styles.decisionIndex}>{item.index}</span>
              <h4 className={styles.decisionTitle}>{item.title}</h4>
              <p className={styles.decisionBody}>{item.body}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      className={cx(styles.decisionsColumns, className)}
      data-case-decisions="true"
      style={
        { "--decisionGridCols": items.length } as CSSProperties
      }
    >
      <p className={styles.blockLabel}>{label}</p>
      <h3 className={styles.blockTitle}>{title}</h3>
      <ol className={styles.decisionGrid}>
        {items.map((item) => (
          <li
            className={styles.decisionCol}
            data-case-decision
            key={item.index}
          >
            <span className={styles.decisionColIndex}>{item.index}</span>
            <h4 className={styles.decisionColTitle}>{item.title}</h4>
            <p className={styles.decisionColBody}>{item.body}</p>
            {item.evidence ? (
              <div className={styles.decisionColSlot}>
                <EvidenceSlot>{`[ ${item.evidence} ]`}</EvidenceSlot>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return <p className={styles.caption}>{children}</p>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}
