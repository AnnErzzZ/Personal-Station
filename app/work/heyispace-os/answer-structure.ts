/**
 * 10 / 12「FROM ANSWER TO EXPLANATION」的数据模型。
 *
 * 这一章的主角是一份真实 Agent 回答内部的信息组织方式：
 * 左侧是六段结构索引，右侧始终是同一份完整回答，
 * Hover / Click 只切换右侧被点亮的区域，不换图、不拆卡。
 *
 * 区域坐标以底图 answer-panel.png 的原始像素（1182 × 1556）为基准，
 * 六段 focus 为内容列宽 + 内容实测 bbox 外扩留白（口径见 ANSWER_PARTS 上方说明）。
 */

export const ANSWER_IMAGE = {
  src: "/cases/heyispace-os/03-agent/answer-panel.png",
  width: 1182,
  height: 1556,
  alt: "Heyispace OS Agent 的一份完整回答：问题、统计范围、一句话结论、关键指标、每日用电量与节电量图表、分析发现、明细入口与统计口径说明",
} as const;

export type AnswerPartId =
  | "conclusion"
  | "metrics"
  | "chart"
  | "findings"
  | "details"
  | "methodology";

export type AnswerPart = {
  id: AnswerPartId;
  index: string;
  name: string;
  body: string;
  /**
   * 真实 1182 × 1556 回答底图中的高亮矩形（= 内容列宽 + 内容 bbox 外扩
   * 留白，见 ANSWER_PARTS 上方说明），遮罩空洞与木框都直接按它画。
   */
  focus: { x: number; y: number; width: number; height: number };
};

/**
 * 六段式回答结构。文案为用户逐字指定的版本（2026-09-22），
 * 与底图里六个部分自上而下的顺序一一对应。
 *
 * focus 语义（2026-09-23 第四次澄清，用户以红框示例定稿）：**框要比内容
 * 大一圈、但不贴边也不压邻段**——四次演化的最终口径：
 *   ① 框内缩进内容（比内容小）✗ ② 外扩 21/35 压到邻段 ✗
 *   ③ 紧贴内容真实边界（文字压框线）✗ ④ 本版 ✓。
 *
 * 规则（实测脚本 probe-10-content-bbox.py + 用户红框反推 probe-10-user-frame.py）：
 *   - **x 六段统一 = { x: 34, width: 1107 }**：内容列（卡区 59–1121）左右
 *     各外扩 25/20，盖过 01/04 文字起笔（54/55）再留呼吸空间——用户红框
 *     左缘 33 比文字左 21、右缘 1136 比卡区右 15，实测同此量级。
 *   - **y = 内容实测 bbox 上下外扩，外扩量 = min(25, 段间空隙的一半)**：
 *     目标留白 25 底图 px（≈14 CSS px，用户红框实测 29/20）；段间空隙
 *     不足 50px 时对半分（02/03 之间只有 23px，各扩 11），相邻框正好在
 *     空隙中线相接，任何框都不越过邻段内容边界。
 *     上/下邻是六段之外的可见内容时同样计入（01 上方是「统计范围」行
 *     底 267，06 下方是点赞图标顶 1380）。
 */
export const ANSWER_PARTS: readonly AnswerPart[] = [
  {
    id: "conclusion",
    index: "01",
    name: "一句话结论",
    body: "直接回答用户问题，快速给出核心判断。",
    /** 内容 y 315–373；上扩 24（上邻「统计范围」行底 267）、下扩 23（02 顶 419）。 */
    focus: { x: 34, y: 291, width: 1107, height: 105 },
  },
  {
    id: "metrics",
    index: "02",
    name: "关键指标",
    body: "提取当前问题相关的核心数据，帮助用户快速确认结果。",
    /** 内容 y 419–540；上扩 23（01 底 373）、下扩 11（与 03 平分 23px 空隙）。 */
    focus: { x: 34, y: 396, width: 1107, height: 155 },
  },
  {
    id: "chart",
    index: "03",
    name: "图表",
    body: "通过趋势、对比和变化关系，帮助理解数据变化。",
    /** 内容 y 563–984；上扩 11、下扩 12（与 02/04 平分空隙）。 */
    focus: { x: 34, y: 552, width: 1107, height: 444 },
  },
  {
    id: "findings",
    index: "04",
    name: "分析发现",
    body: "提炼数据中的变化、规律和重点信息。",
    /** 内容 y 1008–1101；上扩 12（03 底 984）、下扩 25（05 顶 1154）。 */
    focus: { x: 34, y: 996, width: 1107, height: 130 },
  },
  {
    id: "details",
    index: "05",
    name: "表格和明细",
    body: "支持进一步查看具体对象、时间和空间明细。",
    /** 折叠条 y 1154–1215；上扩 25（04 底 1101）、下扩 23（06 顶 1262）。 */
    focus: { x: 34, y: 1129, width: 1107, height: 109 },
  },
  {
    id: "methodology",
    index: "06",
    name: "指标口径和计算说明",
    body: "说明数据来源、统计范围和计算方式，供用户核对结果。",
    /** 折叠条 y 1262–1323；上扩 23（05 底 1215）、下扩 25（点赞图标顶 1380）。 */
    focus: { x: 34, y: 1239, width: 1107, height: 109 },
  },
] as const;

export function getNextAnswerPartId(current: AnswerPartId, key: string) {
  const currentIndex = ANSWER_PARTS.findIndex((part) => part.id === current);
  if (key === "Home") return ANSWER_PARTS[0].id;
  if (key === "End") return ANSWER_PARTS.at(-1)!.id;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
    return current;
  }

  const delta =
    key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const nextIndex =
    (currentIndex + delta + ANSWER_PARTS.length) % ANSWER_PARTS.length;
  return ANSWER_PARTS[nextIndex].id;
}

