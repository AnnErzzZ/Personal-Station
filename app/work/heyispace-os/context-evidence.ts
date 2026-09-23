export type ContextEvidenceId = "location" | "object" | "result";

/**
 * 高亮框几何。横轴按舞台宽度百分比，纵轴按**框自身高度**百分比
 * ——单个元素要能对 top / left / width / height 四个值插值，必须避开
 * `height` 的百分比循环依赖（height 若也是舞台百分比，就会隐式依赖自身）。
 * 因此每帧按 `y = top + (height / 100) * y` 换算成绝对百分比。
 */
export type ContextFocusBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ContextEvidenceStep = {
  id: ContextEvidenceId;
  index: string;
  title: string;
  body: string;
  evidenceStatus: "available" | "partial" | "gap";
  statusLabel: string;
  annotation: string;
  /**
   * 画布内浮标签的文案。默认与 `annotation` 相同；02 取短版——标签统一
   * 飘在框外右上角、右缘对齐框右缘向左伸展，长文案会横跨大半张地图截图
   * （完整说法留给 figure 下方的 figcaption）。
   */
  annotationShort?: string;
  /** 桌面（object-fit: contain）下高亮框的舞台几何。 */
  focus: ContextFocusBox;
  /** 移动端（object-fit: cover + object-position）下重算的高亮框几何。 */
  focusCover: ContextFocusBox;
  src: string;
  alt: string;
};

export const CONTEXT_EVIDENCE_STEPS: readonly ContextEvidenceStep[] = [
  {
    id: "location",
    index: "01",
    title: "确认当前位置",
    body: "界面显示当前区域、建筑与楼层，供用户核对所处位置。",
    evidenceStatus: "available",
    statusLabel: "真实证据",
    // 降噪轮（2026-09-23）：annotation 只保留「对象 + 核心信息」，
    // 不写完整解释句（解释由 title / body 承担）。
    annotation: "真实平面图",
    // 舞台 %：top 9% / left 17.5% / 34% × 13%（13% 高 = 框高 81.9px）
    focus: { x: 17.5, y: 9, width: 34, height: 13 },
    // ≤720 cover 取景 21% center 下的反算值（数值沿用改造前实测）
    focusCover: { x: 6, y: 9, width: 88, height: 20 },
    src: "/cases/heyispace-os/05-multi-view/device-view.png",
    alt: "HEYISPACE OS 空间地图设备视图，顶部显示当前区域、建筑与楼层，设备图标分布在对应房间内",
  },
  {
    id: "object",
    index: "02",
    title: "确认当前对象",
    body: "选中设备后，地图高亮设备位置，并显示对应的设备信息与控制面板。",
    evidenceStatus: "available",
    statusLabel: "真实证据",
    annotation: "选中设备与控制面板",
    // 标签要短到不压右上角浮层（完整说法见 figcaption）。
    annotationShort: "选中设备",
    /*
     * 框「设备 + 右侧控制卡片」的并集（交付图 900x562 实测扫色取边界，
     * 不是估的）：设备蓝环 x530.4–553.8 / y358.8–393.8，
     * 卡片 x556.75–712.42 / y259.25–374.92，外扩 2px 含住投影。
     * 舞台 %：x 58.93 / y 46.13 / 20.22 × 23.94
     */
    focus: { x: 58.93, y: 46.13, width: 20.22, height: 23.94 },
    /*
     * ≤720 cover 下 stage 350x437.5、scale=max(350/900,437.5/562)=0.7785，
     * 图片横向被裁 450 图内像素。object-position 由 56% 右移到 64%，
     * 可见区间 288..738 才容得下卡片右沿 712.4（56% 时只能看到 701.8）。
     */
    focusCover: { x: 53.86, y: 46.13, width: 40.48, height: 23.94 },
    src: "/cases/heyispace-os/06-context/device-selected.png",
    alt: "HEYISPACE OS 空间地图中一台设备处于选中状态，设备带高亮环并弹出控制面板，面板内显示设备名称与控制开关",
  },
  {
    id: "result",
    index: "03",
    title: "查看操作结果",
    body: "操作后，界面显示结果提示与控制面板状态，供用户核对。",
    evidenceStatus: "available",
    statusLabel: "真实证据",
    annotation: "结果反馈",
    // 舞台 %：top 42.7% / left 64% / 13.2% × 6.4%
    focus: { x: 64, y: 42.7, width: 13.2, height: 6.4 },
    focusCover: { x: 58.3, y: 42.6, width: 24.2, height: 6.6 },
    src: "/cases/heyispace-os/06-context/control-feedback.png",
    alt: "HEYISPACE OS 空间地图顶部显示“已关闭 业务区3排灯”的结果提示条，控制面板开关呈关闭态",
  },
] as const;

const IDS = CONTEXT_EVIDENCE_STEPS.map((step) => step.id);

export function getNextContextEvidenceId(
  currentId: ContextEvidenceId,
  key: string,
): ContextEvidenceId {
  if (key === "Home") return IDS[0];
  if (key === "End") return IDS[IDS.length - 1];

  const direction =
    key === "ArrowRight" || key === "ArrowDown"
      ? 1
      : key === "ArrowLeft" || key === "ArrowUp"
        ? -1
        : 0;

  if (direction === 0) return currentId;

  const currentIndex = IDS.indexOf(currentId);
  return IDS[(currentIndex + direction + IDS.length) % IDS.length];
}
