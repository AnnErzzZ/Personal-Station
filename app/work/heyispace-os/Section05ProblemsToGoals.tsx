import type { CSSProperties } from "react";

import { Chapter, SectionHeader } from "./CaseSection";
import { ProblemGoalScene } from "./ProblemGoalScenes";
import RevealOnView from "./RevealOnView";
import styles from "./sections.module.css";

/**
 * 05 / 12｜From Problems to Design Goals · 从问题到设计目标
 * （2026-09-22 结构调整：原 05 Core Problems 与 06 Design Goals 合并；
 *   同日晚二次改版：横向行结构 → 五张等宽卡片，用户发参考图指定，
 *   早版「editorial 行结构、有意不做卡片」的决定由本次指令推翻）。
 *
 * 合并原因：问题与设计目标严格一一对应，拆成连续两页会产生重复阅读。
 * 本章直接表达 Problem → Design Goal，让读者同时看到
 * 「系统产生了什么问题」与「后续设计用什么原则应对」。
 *
 * 构图 = 五张等宽 Problem × Goal 卡（问题与目标同一张卡）：
 *   编号（品牌蓝 mono）→ 问题（Secondary）→ 设计目标（视觉主角，Primary）
 *   + 一句原则。卡面：白面板 --cs-panel、1px --cs-rule 描边、18px 圆角、
 *   resting 轻阴影；GOAL 区贴底对齐（横排扫视时五张卡的目标块同基线）。
 *   hover（用户触发、可逆）：抬升 translateY(-6px) + 阴影加深 +
 *   卡内底部品牌蓝渐变光斑（::after opacity，不占布局、不进残留扫描）；
 *   reduced-motion 下静止。
 *
 * 降噪（2026-09-22 晚，用户指令「卡片的元素太多了，给页面降噪」）：
 *   PROBLEM / GOAL 两个 11px 英文辅助标签删除；
 *   目标标题 22 → 18px，问题 17px/500 → 15px/400，原则 15 → 14px，
 *   编号 15 → 13px。层级仍为 Goal > Problem > Principle，整体更安静。
 * 2026-09-23：卡内竖向转化箭头按用户指示删除（问题在上、目标在下的
 *   上下结构本身已表达转化关系）。
 *
 * 视觉权重：Goal 18px/600 > Problem 15px/400 > 原则 14px/400（颜色更浅）>
 * 编号 13px/600；品牌蓝只用于编号与 hover 光斑，不铺满整页。
 * 与后续章节的结构对应写在 data-maps-to（纯英文，不作为可见导航展示）：
 *   01 → 06 TURN DATA INTO ANSWERS + 10 FROM ANSWER TO EXPLANATION；
 *   02 → 07 KEEP THE CONTEXT；03 → 08 ONE SPACE, DIFFERENT TASKS；
 *   04 → 09 FROM FLOOR PLAN TO DIGITAL SPACE；
 *   05 → 11 CONTROL COMPLEXITY BY ROLE。
 *
 * 事实边界（docs/cases/heyispace-os.md §0 / §G / §H）：
 * - 五组问题与目标来自真实产品结构和任务的 Case Study 整理，
 *   不是虚构用户研究结果；不出现访谈、客户反馈、效率数据、
 *   错误率、满意度与量化结果。
 * - 入场保持克制：卡 01 → 05 轻微 stagger（opacity/translateY），
 *   无卡片飞入、无路径动画、无滚轮驱动、无 hover 才显示的核心内容；
 *   终态 transform:none、无 filter、无 will-change（防半像素重采样发糊；
 *   hover 态例外，验收在非 hover 状态下扫残留）。
 */

type ProblemGoalPair = {
  index: string;
  scene: string;
  /** 问题：弱一级，Secondary Text。 */
  problem: string;
  /** 设计目标：视觉主角，Primary Text。 */
  goal: string;
  /** 一句原则：说明这一条目标在任务里意味着什么。 */
  principle: string;
  /** 结构对应（不整页展示）：对应后续 Key Design 英文章名。 */
  mapsTo: string[];
};

const pairs: ProblemGoalPair[] = [
  {
    index: "01",
    scene: "04",
    problem: "用户需要同时查看运行数据的趋势、明细和统计口径，才能核对判断。",
    goal: "让数据可以被理解和验证",
    principle: "从结果、趋势到明细与口径，让每一个判断都有依据可追溯。",
    mapsTo: ["TURN DATA INTO ANSWERS", "FROM ANSWER TO EXPLANATION"],
  },
  {
    index: "02",
    scene: "01",
    problem: "层级与对象不断切换时，用户容易失去当前位置和操作对象。",
    goal: "保持操作上下文",
    principle: "让位置、当前对象与操作范围在任务过程中始终可确认。",
    mapsTo: ["KEEP THE CONTEXT"],
  },
  {
    index: "03",
    scene: "02",
    problem: "同一个空间，在不同任务下需要的信息并不相同。",
    goal: "围绕任务组织信息",
    principle: "根据当前任务呈现对应的信息视角和操作入口。",
    mapsTo: ["ONE SPACE, DIFFERENT TASKS"],
  },
  {
    index: "04",
    scene: "03",
    problem: "位置、方向、范围和区域关系需要在空间位置上共同呈现。",
    goal: "让复杂空间关系可视化",
    principle: "通过画布、位置和范围直接表达空间对象之间的关系。",
    mapsTo: ["FROM FLOOR PLAN TO DIGITAL SPACE"],
  },
  {
    index: "05",
    scene: "05",
    problem: "不同角色需要的功能入口、操作权限和数据范围各不相同。",
    goal: "控制复杂度的暴露范围",
    principle: "让不同角色只接触完成当前任务所需要的信息和能力。",
    mapsTo: ["CONTROL COMPLEXITY BY ROLE"],
  },
];

/** 入场顺序：章头 → 卡 01 → 05，轻微 stagger。 */
const REVEAL_STEP_MS = 60;

const revealDelay = (order: number) =>
  ({ "--reveal-delay": `${order * REVEAL_STEP_MS}ms` }) as CSSProperties;

export default function Section05ProblemsToGoals() {
  return (
    <Chapter id="section-05-problems-goals" className={styles.chapterProblemsGoals}>
      <RevealOnView className={styles.pgReveal}>
        <SectionHeader
          index="05"
          total="12"
          title="问题与目标"
          intro="五个设计目标分别对应数据解释、操作上下文、任务信息、空间关系和角色权限。"
        />
      </RevealOnView>

      <RevealOnView className={styles.pgReveal}>
        <div className={styles.pgFramework} data-section05-framework="">
          {/* 五张 Problem × Goal 卡：一行五张等宽，问题与目标同一张卡。 */}
          <ol className={styles.pgList}>
            {pairs.map((pair, pairIndex) => (
              <li
                className={`${styles.pgCard} ${styles.revealItem}`}
                data-pair-index={pair.index}
                data-maps-to={pair.mapsTo.join(" · ")}
                key={pair.index}
                style={revealDelay(pairIndex + 1)}
              >
                {/* 降噪版卡头：只留品牌蓝编号，无英文辅助标签。 */}
                <span className={styles.pgIndex} data-pair-num="">
                  {pair.index}
                </span>
                {/* 深色场景插画：每条设计目标的字面示意，hover 时图形响应。
                 * 风格源 = 用户发参考图；图形语言见 ProblemGoalScenes.tsx。 */}
                <div
                  aria-hidden="true"
                  className={styles.pgScene}
                  data-pair-scene={pair.scene}
                >
                  <ProblemGoalScene index={pair.scene} />
                </div>
                <p className={styles.pgProblem} data-pair-problem="">
                  {pair.problem}
                </p>
                <div className={styles.pgGoal} data-pair-goal="">
                  <h3 className={styles.pgGoalTitle}>{pair.goal}</h3>
                  <p className={styles.pgPrinciple}>{pair.principle}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </RevealOnView>
    </Chapter>
  );
}
