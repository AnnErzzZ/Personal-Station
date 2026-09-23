import { Chapter, SectionHeader } from "./CaseSection";
import styles from "./sections.module.css";

const statusGroups = [
  {
    label: "已落地",
    dot: styles.statusDot,
    items: [
      "空间地图与地图编辑相关能力",
      "空间 / 房间与设备管理",
      "策略、日志与批量处理相关能力",
      "点云、设备、工位和历史回看视图",
      "运行统计与分析",
      "用户、组织、权限与系统相关能力",
    ],
  },
  {
    label: "Agent · 内部验证 / Demo",
    dot: styles.statusDotDemo,
    items: [
      "Agent 查询、追问和六段式回答结构",
      "回答中的指标、图表、分析发现、明细和口径说明",
    ],
  },
  {
    label: "未上线设计",
    dot: styles.statusDotPlanned,
    items: [
      "高保真综合运行报告",
      "其他计划能力暂不在本案例中展示",
    ],
  },
];

/**
 * 我的角色按贡献层级分组（事实来自 docs/cases/heyispace-os.md §B）。
 * 原来是一串平铺的 bullet，「梳理需求」和「主导地图编辑器重构」被摆成同一权重，
 * 等于把自己的核心贡献稀释掉——知道边界在哪本身也是判断力。
 */
const roleTiers = [
  {
    label: "我主导的设计",
    items: [
      "地图编辑器的功能结构、编辑流程与 UX / UI 重构",
      "Agent 六段式回答结构",
      "Agent 页面框架、查询与追问体验、证据呈现",
    ],
  },
  {
    label: "团队共同推进，我负责深化",
    items: ["产品方向与空间地图能力", "多视图的信息组织", "用户、组织与权限相关体验"],
  },
  {
    label: "产品经理提出方向，我负责 UX / UI 深化",
    items: ["Agent 产品方向", "批量处理相关体验", "已上线运行分析需求"],
  },
  {
    label: "既有能力，我负责 UX / UI 升级",
    items: ["空间与房间管理", "设备控制与日志、策略", "运行统计与分析"],
  },
];

export default function Section07OutcomeRole() {
  return (
    <Chapter id="section-12-impact-reflection" className={styles.chapter07}>
      <SectionHeader
        className={styles.headerCentered}
        index="12"
        total="12"
        title="结果与复盘"
        intro={
          <>
            空间地图、地图编辑、多视图、运行统计和系统权限已经进入真实产品。
            Agent 主要用于内部验证和部分 Demo。
            我主导了地图编辑器重构和 Agent 回答结构，并跟进设计评审、研发 Review 和部分验收。
          </>
        }
      />

      <div className={styles.statusGroups}>
        {statusGroups.map((group) => (
          <div className={styles.statusGroup} key={group.label}>
            <p className={styles.statusLabel}>
              <span className={`${styles.statusDot} ${group.dot}`} aria-hidden="true" />
              {group.label}
            </p>
            <ul className={styles.statusItems}>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section className={styles.roleTiers} data-section07-role>
        <p className={styles.blockLabel}>我的角色</p>
        <h3 className={styles.blockTitle}>我在这套系统里负责哪几块</h3>
        <div className={styles.roleTierGrid}>
          {roleTiers.map((tier, index) => (
            <div className={styles.roleTier} key={tier.label}>
              <span className={styles.roleTierIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className={styles.roleTierLabel}>{tier.label}</p>
              <ul className={styles.statusItems}>
                {tier.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.ending}>
        这个项目让我从设计单个页面，开始更多地思考空间、设备、策略和数据之间的关系，
        以及用户该怎样理解和操作它们。
      </p>
    </Chapter>
  );
}
