import { Chapter, SectionHeader } from "./CaseSection";
import RevealOnView from "./RevealOnView";
import RunningDataStage from "./RunningDataStage";
import styles from "./sections.module.css";

/** 06 / 12｜Key Design 01 · TURN DATA INTO ANSWERS */
export default function Section09OperationsData() {
  return (
    <Chapter id="section-09-running-data" className={styles.chapterRunningData}>
      <RevealOnView className={styles.runningReveal}>
        <div className={styles.revealItem}>
          <SectionHeader
            className={styles.runningHeader}
            index="06"
            total="12"
            title="用数据做判断"
            intro="把分散的运行数据，组织成可以快速判断项目状态的信息。"
          />
        </div>
      </RevealOnView>

      <RevealOnView className={styles.runningReveal}>
        <div className={styles.revealItem}>
          <RunningDataStage />
        </div>
      </RevealOnView>
    </Chapter>
  );
}
