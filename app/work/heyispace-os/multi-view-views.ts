export type MultiViewId = "point-cloud" | "device" | "workstation" | "playback";

export type MultiView = {
  id: MultiViewId;
  name: string;
  description: string;
  image: string;
  alt: string;
};

/**
 * 07 / 12 四种任务视图（由旧 05/07 直接迁移）。
 * Tab、主图与 Tab 下的一句话说明共用这一份定义，避免图片与文案顺序错位。
 * 四张素材均为同一项目、同一楼层的实拍界面（4320 × 2700）。
 *
 * description 是 2026-09-18 改版（复刻参考图的「主图 → pill Tab → 说明」结构）
 * 时用户指定的版本：每个视图一句话，跟随 active Tab 显示在主图下方。
 * 两条事实边界（点云非摄像/不做身份识别；工位姓名来自业务绑定）不再占说明句，
 * 降级为说明区下方的固定小字 MULTI_VIEW_FACTS，仍然必须留在页面上（docs §G）。
 * 英文视图名留在 docs 与 alt 里，页面正文本就用界面自己的中文名。
 */
export const MULTI_VIEWS: readonly MultiView[] = [
  {
    id: "point-cloud",
    name: "点云",
    description: "通过点云查看人员在空间中的实时位置和活动状态。",
    image: "/cases/heyispace-os/05-multi-view/point-cloud.png",
    alt: "点云视图：楼层平面图上显示空间内人员的实时位置和状态",
  },
  {
    id: "device",
    name: "设备",
    description: "直接在空间地图中查看设备位置、在线状态和当前运行情况。",
    image: "/cases/heyispace-os/05-multi-view/device-view.png",
    alt: "设备视图：楼层平面图上显示各空间内设备的位置和运行状态",
  },
  {
    id: "workstation",
    name: "工位",
    description: "以工位为单位查看位置、占用情况和空间使用状态。",
    image: "/cases/heyispace-os/05-multi-view/workstation-view.png",
    alt: "工位视图：楼层平面图上显示工位占用情况，以及工位绑定的员工姓名和部门",
  },
  {
    id: "playback",
    name: "回放",
    description: "按时间回看空间状态变化，帮助用户复盘一段时间内的使用情况。",
    image: "/cases/heyispace-os/05-multi-view/playback-view.png",
    alt: "回放视图：用当天时间轴回看空间占用和设备状态随时间的变化",
  },
];

/** 两条事实边界（docs §G），固定显示在视图说明下方的小字，不随 Tab 切换。 */
export const MULTI_VIEW_FACTS =
  "点云为非摄像画面，不做身份识别；工位姓名来自员工与固定工位的业务绑定。";

export const MULTI_VIEW_PANEL_ID = "section08-view-panel";
