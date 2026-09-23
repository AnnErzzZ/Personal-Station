export type MapEditorStepId =
  | "canvas"
  | "rooms"
  | "radar"
  | "zones"
  | "publish";

/**
 * 素材状态（同 07 章 context-evidence 的分级口径）：
 * - product   该步骤有真实产物可指认，素材位将放对应截图。
 * - partial   产物的一部分可见（如平面图底图），该步骤自身的操作界面素材待补。
 * - gap       该步骤的编辑界面完全没有素材，素材位只保留克制的待补标注。
 */
export type MapEvidenceStatus = "product" | "partial" | "gap";

export type MapEditorStep = {
  id: MapEditorStepId;
  index: string;
  /** 步骤完整标题（Bento 格标题，用户逐字定稿）。 */
  title: string;
  /** 为什么这一层信息存在。不写成操作教程。 */
  body: string;
  /** 该步骤覆盖的配置内容（「包含」行）。 */
  includes: readonly string[];
  status: MapEvidenceStatus;
  statusLabel: string;
  /** 该步骤对应的编辑界面截图。 */
  image: { src: string; alt: string };
};

/**
 * 09 / 12｜Key Design 04 · FROM FLOOR PLAN TO DIGITAL SPACE
 *
 * 5 步真实主流程（SoT §B / §E-04，2026-09-22 用户确认：8 步归组为 6 步后，
 * 21:57 再由用户确认「配置统计关系」移出主流程——统计关系属后续数据组织
 * 能力，不属于从平面图构建数字空间的主流程，删除后流程以发布收口）：
 *   空间底图 → 空间结构 → 设备位置 → 检测范围 → 发布。
 * 步骤名为用户逐字指定（19:57 定稿）。归组关系：01 = 原上传平面图 + 输入
 * 真实尺寸；03 = 原雷达锚点 + 安装参数；04 = 原有效范围 + 检测区 / 工位区。
 * id 保留 rooms / radar / zones，与历史锚点命名一致。
 *
 * 呈现（2026-09-22 22 时二次改版，用户指定）：5 步改为 5 格 Bento Grid
 * （通用组件 components/ui/bento-grid.tsx），原「主舞台 crossfade +
 * Process Rail + 当前步骤说明」下线。素材于 2026-09-23 由用户提供
 * （5 张真实编辑界面截图，编号一一对应），边缘用 CSS mask 做羽化过渡。
 */
export const MAP_EDITOR_STEPS: readonly MapEditorStep[] = [
  {
    id: "canvas",
    index: "01",
    title: "准备空间底图",
    body: "从真实平面图开始，建立可编辑空间基础，并通过真实尺寸建立比例关系。",
    includes: ["上传平面图", "输入真实尺寸"],
    status: "product",
    statusLabel: "真实产物",
    image: {
      src: "/cases/heyispace-os/08-map-editor/step-01-canvas.png",
      alt: "HEYISPACE OS 地图编辑器：创建区域界面，从平面图建立可编辑空间底图",
    },
  },
  {
    id: "rooms",
    index: "02",
    title: "建立空间结构",
    body: "将平面图转换为系统可理解的空间结构，为设备和策略提供归属关系。",
    includes: ["房间 / Frame", "空间边界"],
    status: "product",
    statusLabel: "真实产物",
    image: {
      src: "/cases/heyispace-os/08-map-editor/step-02-rooms.png",
      alt: "HEYISPACE OS 地图编辑器：构建房间界面，将平面图转换为房间 Frame 与空间边界",
    },
  },
  {
    id: "radar",
    index: "03",
    title: "配置设备位置",
    body: "将设备映射到真实安装位置，并补充设备运行所需的空间参数。",
    includes: ["设备锚点", "安装高度", "方向"],
    status: "product",
    statusLabel: "真实产物",
    image: {
      src: "/cases/heyispace-os/08-map-editor/step-03-radar.png",
      alt: "HEYISPACE OS 地图编辑器：配置设备界面，在空间中放置雷达设备锚点并设置安装参数",
    },
  },
  {
    id: "zones",
    index: "04",
    title: "编辑检测范围",
    body: "根据设备能力调整覆盖范围，让感知结果对应实际业务区域。",
    includes: ["有效范围", "检测区", "工位区"],
    status: "product",
    statusLabel: "真实产物",
    image: {
      src: "/cases/heyispace-os/08-map-editor/step-04-zones.png",
      alt: "HEYISPACE OS 地图编辑器：编辑检测区域界面，在设备覆盖范围内划分检测区与工位区",
    },
  },
  {
    id: "publish",
    index: "05",
    title: "发布空间地图修改",
    body: "完成空间、设备与区域配置后，将数字空间发布到系统中参与运行。",
    includes: ["发布", "生效"],
    status: "product",
    statusLabel: "真实产物",
    image: {
      src: "/cases/heyispace-os/08-map-editor/step-05-publish.png",
      alt: "HEYISPACE OS 地图编辑器：发布界面，将配置完成的空间地图发布到系统生效",
    },
  },
] as const;
