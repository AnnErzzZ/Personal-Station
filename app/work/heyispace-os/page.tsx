import type { Metadata } from "next";

import "./macbook-scroll.tailwind.css";
import HeroTransition from "./HeroTransition";
import Section03UsersTasks from "./Section03UsersTasks";
import Section04Complexity from "./Section04Complexity";
import Section05ProblemsToGoals from "./Section05ProblemsToGoals";
import Section07Context from "./Section07Context";
import Section08MultiView from "./Section08MultiView";
import Section08MapEditor from "./Section08MapEditor";
import Section09OperationsData from "./Section09OperationsData";
import Section03Agent from "./Section03Agent";
import Section11RoleAccess from "./Section11RoleAccess";
import Section12ImpactReflection from "./Section12ImpactReflection";

export const metadata: Metadata = {
  title: "Heyispace OS 案例研究",
  description:
    "围绕空间、设备、策略、运行数据与 Agent 的智能空间 Web 系统设计案例。",
};

export default function HeyispaceOsPage() {
  return (
    <main>
      {/* 01 Hero（MacbookScroll 舞台，2026-09-23 替换旧倾斜截图场景）
          与 02 Project Context（macStage 裁切线后滚入）。 */}
      <HeroTransition />
      {/* 03 / 12 · Users & Tasks */}
      <Section03UsersTasks />
      {/* 04 / 12 · Product Complexity：承接「谁在使用」，回答「系统为什么复杂」；
          内容迁移自旧 02 产品结构（SoT §0）。旧 02 已于 2026-09-22 下线：
          核心链路统一由本章关系图与链路动画面板呈现，不再用文字复述。 */}
      <Section04Complexity />
      {/* 新结构 05/12 From Problems to Design Goals：承接「为什么复杂」，
          把五个问题与五条设计目标一一对应地放进同一章（2026-09-22 合并
          原 05 Core Problems 与 06 Design Goals，避免重复阅读）；
          横向 Strategy Framework 构图。 */}
      <Section05ProblemsToGoals />
      {/* 06 / 12 · TURN DATA INTO ANSWERS：先展示项目亮点——运行数据判断。 */}
      <Section09OperationsData />
      {/* 07/12 Key Design 02 · KEEP THE CONTEXT：同一张真实设备视图
          上的位置、对象与状态焦点。素材缺口直接标明，不补造产品 UI。 */}
      <Section07Context />
      {/* 08/12 Key Design 03 · ONE SPACE, DIFFERENT TASKS：保持现有实现不变。 */}
      <Section08MultiView />
      {/* 09/12 Key Design 04：同一空间从平面图到数字空间的 5 步
          真实主流程。内容迁移自旧 04 地图编辑器（SoT §0：原 04 → 09），
          旧地图编辑器占位实现已由本章取代并从页面摘除。
          素材缺口直接标明，不补造产品 UI。 */}
      <Section08MapEditor />
      {/* 10 / 12 · FROM ANSWER TO EXPLANATION：左侧六段结构索引 +
          右侧同一份完整真实 Agent 回答，Hover / Click 切换高亮区域。 */}
      <Section03Agent />
      {/* 11 / 12 · CONTROL COMPLEXITY BY ROLE：Role → Capability → Scope
          三列按行对齐的 editorial 结构；权限用来控制复杂度的暴露范围，
          不做权限表格、不重绘后台。素材缺口如实标注。 */}
      <Section11RoleAccess />
      {/* 12 / 12 · DESIGN REFLECTION「从复杂能力，到清晰体验」：
          章头一句核心总结 → 三个 Reflection Statement（各带对应章节
          锚点，回扣空间 / 角色 / 数据 AI）→ My Role 贡献收尾。
          Editorial Reflection Layout：无卡片阵、无 KPI 墙、无滚轮驱动。
          旧「设计方法与复盘」四块结构（来源卡 / 方法卡 / 旧反思 /
          四层角色分组）已整体删除（2026-09-23 用户决定）。
          旧 Section07OutcomeRole 的实现此前已由 12 章取代，文件不再引用。 */}
      <Section12ImpactReflection />
    </main>
  );
}
