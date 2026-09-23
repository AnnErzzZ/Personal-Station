import { Chapter, SectionHeader } from "./CaseSection";
import ContextEvidenceStage from "./ContextEvidenceStage";
import RevealOnView from "./RevealOnView";
import styles from "./sections.module.css";

export default function Section07Context() {
  return (
    <Chapter id="section-06-context" className={styles.chapterContext}>
      <RevealOnView className={styles.contextReveal}>
        <SectionHeader
          className={`${styles.contextHeader} ${styles.contextRevealItem}`}
          index="07"
          total="12"
          title="保持操作上下文"
          intro="面对复杂空间关系，设计重点是让用户始终知道自己在哪里、正在操作什么。"
        />
      </RevealOnView>

      <RevealOnView className={styles.contextReveal}>
        <div className={styles.contextRevealItem}>
          <ContextEvidenceStage />
        </div>
      </RevealOnView>
    </Chapter>
  );
}
