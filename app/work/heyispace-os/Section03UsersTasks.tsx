import type { CSSProperties } from "react";

import { Chapter, SectionHeader } from "./CaseSection";
import RevealOnView from "./RevealOnView";
import styles from "./sections.module.css";

/**
 * 03 / 12｜Users & Tasks · 用户与核心任务（2026-09-21 新结构，
 * 2026-09-22 总数 13 → 12）。
 *
 * 三张并列的白色「角色任务卡」：头部（序号 + 角色名 + 弱化英文副标题）
 * → 目标（卡内主陈述）→ 核心任务 → 信息需求，用细分隔线分区。
 * 版式语言参考定价卡（独立卡片 / 大圆角 / 浅描边 / 轻阴影 / 头部内衬块），
 * 但不是 pricing page：三张卡视觉权重一致，没有深色强调卡，没有价格位。
 * 不是 Persona：没有头像、姓名、人数、使用频率和调研数据。
 *
 * 结构标签全部中文化：目标 / 核心任务 / 信息需求；Agent 条目不再挂
 * 「Demo / 内部验证」状态标签（2026-09-23 删除）。
 * 2026-09-23：卡组下方「以下角色按任务范围整理，不代表人数或使用频率。」
 * 说明行按用户指示整段删除。
 *
 * 事实边界（docs/cases/heyispace-os.md §0「03 章角色清单」）：
 * - 运维角色的信息需求不含「有人 / 无人 / 无雷达 / 更新时间」——
 *   那组字段来自合一实施助手的截图，不能挪到本项目。
 * - Agent 相关条目不写成规模化上线的成熟客户能力。
 */

type RoleTask = {
  text: string;
  /** 轻量状态标签（仅 Agent 条目使用），中文、低饱和，不是高亮 Badge。 */
  tag?: string;
};

type Role = {
  index: string;
  name: string;
  goal: string;
  tasks: RoleTask[];
  needs: string[];
};

const roles: Role[] = [
  {
    index: "01",
    name: "交付与配置人员",
    goal: "把现场的真实空间结构配置进系统，产出一份能够被其他模块读取的空间地图。",
    tasks: [
      { text: "上传平面图，建立楼层与房间结构" },
      { text: "放置设备、命名工位" },
      { text: "发布空间结构" },
      { text: "对照楼层图核对设备位置与在线状态" },
    ],
    needs: [
      "当前选中的对象，以及这个对象对应的配置字段",
      "当前编辑是否已经发布",
      "哪些改动仍处于未发布状态",
    ],
  },
  {
    index: "02",
    name: "运维人员",
    goal: "随时知道空间和设备当前是什么状态，并能够定位到具体位置。",
    tasks: [
      { text: "在楼层图中定位设备，查看在线与运行状态" },
      { text: "查看空间与工位占用情况" },
      { text: "回看某个时间段发生的变化" },
      { text: "处理设备异常" },
    ],
    needs: ["设备位置", "在线状态", "占用状态", "当前楼层与空间上下文"],
  },
  {
    index: "03",
    name: "运营与管理人员",
    goal: "判断这个项目最近运行得怎么样。",
    tasks: [
      { text: "查看运行统计：空间使用、自动控制、设备运行与环境变化" },
      { text: "按时间和房间筛选，查看指定范围的运行情况" },
      {
        text: "通过 Agent 提出业务问题，获得结论与依据",
      },
    ],
    needs: [
      "平均占用率",
      "逗留时长",
      "自动率",
      "设备日均运行时长",
      "室内 / 室外平均温度",
      "每一个数字对应的统计范围和指标口径",
    ],
  },
];

/** 入场顺序：章节头一组先出现；卡片内按 头部 → 目标 → 任务 → 需求 逐块轻微 stagger。 */
const REVEAL_STEP_MS = 40;

const revealDelay = (order: number) =>
  ({ "--reveal-delay": `${order * REVEAL_STEP_MS}ms` }) as CSSProperties;

export default function Section03UsersTasks() {
  return (
    <Chapter id="section-03-users" className={styles.chapterUsersTasks}>
      <RevealOnView className={styles.usersReveal}>
        <SectionHeader
          index="03"
          total="12"
          title="用户与任务"
          intro="同一套系统承载不同角色的工作，任务不同，所需要的信息也不同。"
        />
      </RevealOnView>

      <RevealOnView className={styles.usersReveal}>
        {/* 三张独立的角色任务卡：结构一致、视觉权重一致，可各自独立阅读。 */}
        <div className={styles.usersCards} data-section03-users-cards="">
          {roles.map((role, roleIndex) => (
            <article
              className={styles.roleCard}
              data-role-index={role.index}
              key={role.index}
            >
              <header
                className={`${styles.cardHead} ${styles.revealItem}`}
                data-block="head"
                style={revealDelay(roleIndex)}
              >
                <span className={styles.cardIndex}>{role.index}</span>
                <h3 className={styles.cardName}>{role.name}</h3>
              </header>

              <div className={styles.cardBody}>
                <section
                  className={`${styles.cardBlock} ${styles.revealItem}`}
                  data-block="goal"
                  style={revealDelay(roleIndex + 3)}
                >
                  <p className={styles.cardBlockLabel}>目标</p>
                  <p className={styles.cardGoalText}>{role.goal}</p>
                </section>

                <section
                  className={`${styles.cardBlock} ${styles.revealItem}`}
                  data-block="tasks"
                  style={revealDelay(roleIndex + 6)}
                >
                  <p className={styles.cardBlockLabel}>核心任务</p>
                  <ul className={styles.taskList}>
                    {role.tasks.map((task) => (
                      <li className={styles.taskItem} key={task.text}>
                        <span className={styles.taskText}>{task.text}</span>
                        {task.tag ? (
                          <span className={styles.taskTag}>{task.tag}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>

                <section
                  className={`${styles.cardBlock} ${styles.revealItem}`}
                  data-block="needs"
                  style={revealDelay(roleIndex + 9)}
                >
                  <p className={styles.cardBlockLabel}>信息需求</p>
                  <ul className={styles.needsList}>
                    {role.needs.map((need) => (
                      <li className={styles.needsItem} key={need}>
                        {need}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </article>
          ))}
        </div>
      </RevealOnView>
    </Chapter>
  );
}
