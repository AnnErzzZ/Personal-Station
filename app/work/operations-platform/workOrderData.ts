import { orderContinuousDays } from "./model";
import { EVIDENCE_DEVICES } from "./deviceExamples";

export const PROJECT_TYPES = ["正式项目", "试点项目", "展厅测试项目"];

export const POOL_ORDERS = [
  { id: "WO-1008-11", title: "302 会议室设备掉网", type: "设备掉网", status: "处理中", org: "总部", project: "南山总部", projectType: "正式项目", handler: "林工程师", source: "系统自动", date: "2026-10-08", duration: 2.3, faults: "12" },
  { id: "WO-1008-12", title: "项目节能率偏低", type: "节能率异常", status: "待处理", org: "总部", project: "南山总部", projectType: "正式项目", handler: "--", source: "系统自动", date: "2026-10-08", duration: 0, faults: "-" },
  { id: "WO-1008-13", title: "项目自动率未达到阈值", type: "自动率异常", status: "待处理", org: "渠道", project: "前海创新园", projectType: "正式项目", handler: "--", source: "系统自动", date: "2026-10-08", duration: 0, faults: "-" },
  { id: "WO-1007-14", title: "会议室无人节能策略调整", type: "策略变更", status: "已完成", org: "分公司", project: "滨江研发中心", projectType: "试点项目", handler: "陈工程师", source: "人工创建", date: "2026-10-07", duration: 1.5, faults: "6" },
];

export type WorkOrder = typeof POOL_ORDERS[number];
// Daily sample orders preserve the device snapshot for each creation date.
export const ROOM_HISTORY_ORDERS: WorkOrder[] = [
  POOL_ORDERS[0],
  { ...POOL_ORDERS[0], id: "WO-1007-11", date: "2026-10-07", status: "已完成", duration: 1.2, faults: "11" },
  { ...POOL_ORDERS[0], id: "WO-1006-11", date: "2026-10-06", status: "已完成", duration: 1.8, faults: "10" },
];
export const orderDay = (row: WorkOrder) => Math.max(0, Math.min(2, Number(row.date.slice(-2)) - 6));
export const anomalyDays = (row: WorkOrder) => {
  const devices = EVIDENCE_DEVICES.filter((device) => device.project === row.project && device.type === row.type);
  return devices.length ? `${orderContinuousDays(devices, orderDay(row))} 天` : "-";
};
