import { Chapter, SectionHeader } from "./CaseSection";
import AnswerStructureStage from "./AnswerStructureStage";
import styles from "./sections.module.css";

/**
 * 10 / 12｜把结论、依据和统计口径放进同一份回答。
 *
 * 2026-09-23：章内「查询路径对比」按用户指示整块删除——先删 Manual 卡，
 * 再删仅剩的 Agent 卡；本组件只保留六段结构索引 + 同一份完整真实回答。
 */
export default function Section03Agent() {
  return (
    <Chapter id="section-10-answer-structure" className={styles.chapter03}>
      <SectionHeader
        className={styles.section03Header}
        index="10"
        total="12"
        title="让回答有依据"
        intro="已上线的智能空间垂直对话 Agent 根据问题组织结论、关键指标、图表、分析发现、明细和指标口径，方便核对依据与继续追问。"
      />

      {/* 左侧六段结构索引 + 右侧同一份完整真实回答，滚动依次切换高亮区域。 */}
      <AnswerStructureStage />
    </Chapter>
  );
}
