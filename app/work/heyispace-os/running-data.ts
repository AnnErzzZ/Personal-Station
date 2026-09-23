export const DASHBOARD_IMAGE = {
  src: "/cases/heyispace-os/06-operations-dashboard/operations-statistics-detail.png",
  width: 2880,
  height: 2672,
  alt: "Heyispace OS 运行统计完整页面：左侧导航、时间与房间筛选、空间使用分析、自动率相关统计、设备日均运行时长、室内外温度分析与空调运行风速分析",
} as const;

export type RunningDataId =
  | "space"
  | "automation"
  | "device"
  | "environment"
  | "fanspeed";

export type RunningDataDimension = {
  id: RunningDataId;
  index: string;
  name: string;
  question: string;
  body: string;
  evidence: readonly string[];
  /**
   * 真实 2880 × 2672 截图（含左侧导航）中的卡片完整 bbox —— 遮罩和木框
   * 都直接按卡片矩形画，不再内缩（2026-09-23 用户决定：加边距只适用于
   * 10 章「回答结构」；09 章高亮框 = 卡片本身）。
   * 坐标由 scripts/preview-qa/probe-09-card-bbox.py 沿卡片 1px 描边实测：
   * 左右列 x 552 / 1720（各 1120 宽，列间距 48），三行 y 432 / 1152 / 1872
   * （前两行高 672，风速卡通栏 2288 × 760，行间距同为 48）。
   */
  focus: { x: number; y: number; width: number; height: number };
};

export const RUNNING_DATA_DIMENSIONS: readonly RunningDataDimension[] = [
  {
    id: "space",
    index: "01",
    name: "空间使用",
    question: "查看空间使用程度",
    body: "通过逗留时长、占用率与每日变化，查看所选时段内的空间使用情况。",
    evidence: ["空间平均逗留时长", "空间平均占用率", "每日空间逗留变化"],
    focus: { x: 552, y: 432, width: 1120, height: 672 },
  },
  {
    id: "automation",
    index: "02",
    name: "自动控制",
    question: "查看自动控制的使用情况",
    body: "通过自动率和自动 / 手动控制数据，观察自动化在日常运行中的参与情况。",
    evidence: ["灯光自动率", "空调自动率", "其他设备自动率", "自动 / 手动控制数据"],
    focus: { x: 1720, y: 432, width: 1120, height: 672 },
  },
  {
    id: "device",
    index: "03",
    name: "设备运行",
    question: "查看设备日均运行时长",
    body: "通过主要设备的日均运行时长，了解空调与灯光的实际运行情况。",
    evidence: ["空调日均运行时长", "灯光日均运行时长"],
    focus: { x: 552, y: 1152, width: 1120, height: 672 },
  },
  {
    id: "environment",
    index: "04",
    name: "环境变化",
    question: "查看所选时段的温度变化",
    body: "结合室内外平均温度和温度趋势，观察所选时段内的环境变化。",
    evidence: ["室内平均温度", "室外平均温度", "每日室内外平均温度趋势"],
    focus: { x: 1720, y: 1152, width: 1120, height: 672 },
  },
  {
    id: "fanspeed",
    index: "05",
    name: "空调运行风速分析",
    question: "查看空调风速运行分布",
    body: "通过高、中、低三档风速的日均运行时长与每日变化，观察空调运行强度的分布。",
    evidence: [
      "高风速日均运行时长",
      "中风速日均运行时长",
      "低风速日均运行时长",
      "每日空调风速运行时长趋势",
    ],
    focus: { x: 552, y: 1872, width: 2288, height: 760 },
  },
] as const;

export function getNextRunningDataId(current: RunningDataId, key: string) {
  const currentIndex = RUNNING_DATA_DIMENSIONS.findIndex((item) => item.id === current);
  if (key === "Home") return RUNNING_DATA_DIMENSIONS[0].id;
  if (key === "End") return RUNNING_DATA_DIMENSIONS.at(-1)!.id;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return current;

  const delta = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const nextIndex = (currentIndex + delta + RUNNING_DATA_DIMENSIONS.length) % RUNNING_DATA_DIMENSIONS.length;
  return RUNNING_DATA_DIMENSIONS[nextIndex].id;
}
