// 独立书架预览与首页使用一致的 UI 求职定位。
const cases = [
  {
    title: "合一实施助手",
    positioning: "微信小程序 · 界面与状态设计",
    summary: "重构设备配置界面，通过列表层级、选中反馈与异常提示，让批量任务的进度和结果清晰可见。",
    meta: ["UI Design", "Interaction", "Mobile", "IoT"],
    href: "/work/implementation-assistant",
    cover: "/cases/implementation-assistant/hero/implementation-assistant-project-cover.png",
    coverAlt: "合一实施助手项目封面，展示手持手机中的现场设备配置界面",
  },
  {
    title: "Heyispace OS",
    positioning: "Web 管理端 · 地图与数据可视化",
    summary: "设计空间地图、属性面板、数据看板与 Agent 回答界面，组织高密度信息的阅读层级。",
    meta: ["UI Design", "Data Visualization", "Web", "AIoT"],
    href: "/work/heyispace-os",
    cover: "/cases/heyispace-os/hero/heyispace-os-project-cover-v3.png",
    coverAlt: "Heyispace OS 项目封面，展示 Agent 分析界面的电脑样机",
  },
  {
    title: "合一运维平台",
    positioning: "运维后台 · 列表、表单与详情设计",
    summary: "设计异常看板、工单列表与详情，统一筛选、表单和状态反馈，衔接查看、处理与审批。",
    meta: ["UI Design", "Interaction", "Web", "IoT"],
    href: "/work/operations-platform",
    cover: "/cases/operations-platform/hero/operations-platform-project-cover.png",
    coverAlt: "合一运维平台项目封面，展示工单管理界面的电脑样机",
  },
];
const types = ["MOBILE / IoT", "WEB / AIoT", "WEB / OPERATIONS"];
export const projects = cases.map((project, index) => ({
  ...project, id: project.href.split("/").at(-1)!, date: types[index], jacket: `/lab/project-bookshelf/${project.href.split("/").at(-1)}-jacket.png`, color: "#30343b", foil: "#e4e8ed", tags: project.meta,
}));
