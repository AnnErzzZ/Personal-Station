/**
 * 12 / 12「从复杂能力，到清晰体验」（DESIGN REFLECTION）的数据模型。
 *
 * 2026-09-23 按用户需求整章重设计：最后一页不是功能总结，而是设计者
 * 对「这个复杂 B 端系统里我如何处理复杂度」的收束。叙事链：
 *   复杂在哪里 → 如何解决 → 留下什么设计方法。
 *
 * 页面结构（Editorial Reflection Layout）：
 *   章头（12 / 12 + 标题 + 一句核心总结）
 *   → 三个 Reflection Statement（各带「对应章节」引用，回扣前文）
 *   → My Role（设计贡献收尾）。
 *
 * ── 与旧版（设计方法与复盘）的差异 ─────────────────────────────────
 * - 删除 01「面对的复杂关系」四张来源卡（PROBLEM_SOURCES）；
 * - 删除 02「建立的方法」四条方法（METHOD_ITEMS）；
 * - 删除 03 旧三段抽象反思（「设计复杂系统，首先需要建立共同上下文」等，
 *   读成面试回答，不回扣前文）； replaced by 本文件的三条新 Reflection；
 * - 删除 04 四层贡献分组（ROLE_TIERS），改为 My Role 四项能力域收尾
 *   （四项均在 §B 贡献归属范围内，不新增事实、不写「独立完成」）；
 * - 删除章末收束句（IMPACT_CLOSING），核心总结句移到章头标题下方。
 *
 * ── 事实边界（docs/cases/heyispace-os.md §B / §F / §G / §H）─────────
 * - 全章零量化：无百分比、效率、耗时、客户数、项目数、业务收益。
 * - 三条 Reflection 的正文只复述前文已确认的事实：R1 的对象关系来自
 *   04 章口径（空间、设备、策略、数据多套关系互相依赖）；R2 的三类
 *   角色与信息深度对应 03 章角色清单（交付配置 / 运维 / 运营管理）；
 *   R3 的「发生了什么 / 为什么 / 下一步」对应 06 章数据判断与 10 章
 *   回答结构（结论 + 依据 + 口径）。
 * - 「对应章节」引用全部指向页面真实存在的章锚点；短名为页面章节
 *   标题的收敛写法，不新造章名。
 * - My Role 四项是 §B 贡献的能力域概括（Product Design / UX
 *   Architecture / Interaction Design / AI Response Structure），
 *   不升级、不写「独立完成全部系统设计」。
 */

/** 章头核心总结句：一句说清这一页的立场。 */
export const REFLECTION_SUMMARY =
  "在复杂 B 端产品中，设计的价值不是减少功能，而是帮助用户在正确的时间看到正确的信息。";

/** 对应章节引用：编号为页面显示章号，href 为页面真实锚点 id。 */
export type ReflectionRef = {
  /** 页面显示章号（两位）。 */
  index: string;
  /** 页面章节标题的短形式。 */
  label: string;
  /** 页面章节锚点。 */
  href: string;
};

export type ReflectionItem = {
  id: string;
  index: string;
  title: string;
  body: string;
  refs: readonly ReflectionRef[];
};

export const REFLECTION_ITEMS: readonly ReflectionItem[] = [
  {
    id: "space-relations",
    index: "01",
    title: "一个空间，背后连接着大量关系",
    body: "一个办公空间并不只是一个平面图。它同时关联楼层、区域、设备、策略、运行数据和用户任务。设计的第一步，不是隐藏复杂度，而是建立这些信息之间的联系。",
    refs: [
      { index: "04", label: "系统复杂度", href: "#section-04-complexity" },
      { index: "07", label: "保持操作上下文", href: "#section-06-context" },
      { index: "09", label: "搭建数字空间", href: "#section-08-digital-space" },
    ],
  },
  {
    id: "role-depth",
    index: "02",
    title: "一个系统，不应该让所有人看到全部能力",
    body: "交付人员关注配置，运维人员关注状态，管理人员关注结果。同一个系统，需要根据任务和角色呈现不同的信息深度。",
    refs: [
      { index: "03", label: "用户与任务", href: "#section-03-users" },
      { index: "08", label: "按任务切换视图", href: "#section-07-multiview" },
      { index: "11", label: "按角色配置权限", href: "#section-11-role-access" },
    ],
  },
  {
    id: "data-judgment",
    index: "03",
    title: "数据的价值，不在于展示，而在于帮助判断",
    body: "设备产生的数据只有被放入具体的空间和业务场景中，才真正帮助用户理解：发生了什么，为什么发生，下一步应该关注什么。",
    refs: [
      { index: "06", label: "用数据做判断", href: "#section-09-running-data" },
      { index: "10", label: "让回答有依据", href: "#section-10-answer-structure" },
    ],
  },
];

/**
 * My Role：设计贡献收尾，四项能力域。只列范围，不做技能熟练度声明，
 * 不描述「我主导 / 我独立完成」——贡献归属的完整口径保留在 SoT §B。
 */
export type MyRoleItem = {
  id: string;
  label: string;
};

export const MY_ROLE_ITEMS: readonly MyRoleItem[] = [
  { id: "product-design", label: "Product Design" },
  { id: "ux-architecture", label: "UX Architecture" },
  { id: "interaction-design", label: "Interaction Design" },
  { id: "ai-response-structure", label: "AI Response Structure" },
];
