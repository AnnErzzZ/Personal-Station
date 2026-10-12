export type DashboardImage = { src: string; alt: string };

export const DASHBOARD_HOLD_VH = 180;

export function dashboardStageAt(offsetVh: number, folderHoldVh: number) {
  return offsetVh >= folderHoldVh && offsetVh < folderHoldVh + DASHBOARD_HOLD_VH;
}

export function nextDashboardIndex(current: number, direction: -1 | 1, count: number) {
  return count > 0 ? (current + direction + count) % count : 0;
}
