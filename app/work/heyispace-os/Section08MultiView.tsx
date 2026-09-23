import { Chapter, SectionHeader } from "./CaseSection";
import MultiViewTabs from "./MultiViewTabs";
import styles from "./sections.module.css";

/**
 * 08 / 12｜Key Design 03 · ONE SPACE, DIFFERENT TASKS
 *
 * 复用旧 05 的真实四视图舞台，只迁移章节编号与叙事层级。
 * （2026-09-22 重编号：原新结构 08 → 07，id section-08 → section-07-multiview。）
 * 标题后直接进入主图、Tab、当前说明和事实 Caption，不增加 Intro 或判断区块。
 */
export default function Section08MultiView() {
  return (
    <Chapter id="section-07-multiview" className={styles.chapter08}>
      <div className={styles.section08Layout} data-section08-layout>
        <div data-section08-header>
          <SectionHeader
            className={styles.headerCentered}
            index="08"
            total="12"
            title="按任务切换视图"
          />
        </div>

        <MultiViewTabs />
      </div>
    </Chapter>
  );
}
