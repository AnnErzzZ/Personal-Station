export type AnomalyType = "设备掉网" | "设备误关" | "设备误开";

// Display thresholds used by the supplied ReuiProjectTable.vue.
export function healthLabel(score: number) {
  if (score >= 90) return "优秀";
  if (score >= 80) return "良好";
  if (score >= 70) return "异常";
  if (score >= 60) return "严重";
  return "紧急";
}

export type DeviceHistory = {
  id: string;
  name: string;
  room: string;
  project: string;
  type: AnomalyType;
  abnormal: readonly boolean[];
};

// Sample values used in the interactive case study.
export const DAYS = ["10 月 6 日", "10 月 7 日", "10 月 8 日"];
export const DEVICE_HISTORY: DeviceHistory[] = [
  { id: "RD-021", name: "会议室雷达", room: "302 会议室", project: "示例 · 南山总部", type: "设备掉网", abnormal: [true, true, true] },
  { id: "SW-014", name: "智能开关", room: "302 会议室", project: "示例 · 南山总部", type: "设备掉网", abnormal: [true, true, false] },
  { id: "AC-008", name: "空调面板", room: "302 会议室", project: "示例 · 南山总部", type: "设备误关", abnormal: [true, false, true] },
];

export function deviceHistoryAt(device: DeviceHistory, day: number) {
  let continuousDays = 0;
  for (let index = day; index >= 0 && device.abnormal[index]; index--) continuousDays++;
  let occurrences = 0;
  for (let index = 0; index <= day; index++) {
    if (device.abnormal[index] && (index === 0 || !device.abnormal[index - 1])) occurrences++;
  }
  return { continuousDays, occurrences };
}

export function orderContinuousDays(devices: DeviceHistory[], day: number) {
  return Math.max(0, ...devices.map((device) => deviceHistoryAt(device, day).continuousDays));
}

export function deviceAnomalyEpisodes(device: DeviceHistory, day: number) {
  const episodes: { start: number; recovered: number | null; days: number }[] = [];
  for (let index = 0; index <= day && index < device.abnormal.length; index++) {
    if (device.abnormal[index]) {
      if (index === 0 || !device.abnormal[index - 1]) episodes.push({ start: index, recovered: null, days: 0 });
      episodes[episodes.length - 1].days++;
    } else if (index > 0 && device.abnormal[index - 1]) episodes[episodes.length - 1].recovered = index;
  }
  return episodes.reverse();
}

export function dailyOrders(devices: DeviceHistory[], day: number) {
  const groups = new Map<string, { id: string; project: string; room: string; type: AnomalyType; devices: DeviceHistory[] }>();
  for (const device of devices) {
    if (!device.abnormal[day]) continue;
    const key = JSON.stringify([device.project, device.room, device.type]);
    const order = groups.get(key) ?? {
      id: `AUTO-${day + 1}-${groups.size + 1}`,
      project: device.project,
      room: device.room,
      type: device.type,
      devices: [],
    };
    order.devices.push(device);
    groups.set(key, order);
  }
  return [...groups.values()];
}

export type ApprovalScenario = "single" | "onsite" | "multiple" | "energy" | "automation" | "manual";
export const SCENARIOS: { id: ApprovalScenario; label: string; description: string }[] = [
  { id: "single", label: "单设备线上", description: "常规单设备异常采用线上处理，记录结果后直接完成。改为现场处理时，需要主管审批。" },
  { id: "onsite", label: "单设备线下", description: "现场操作或更换设备需要主管复核，即使只涉及一台设备，也在处理后提交审批。" },
  { id: "multiple", label: "多设备异常", description: "工单涉及多台设备，处理后由主管逐项确认结果。" },
  { id: "energy", label: "节能率异常", description: "主管结合统计周期、节能率和调整措施，确认处理是否有效。" },
  { id: "automation", label: "自动率异常", description: "主管核对自动率和处理说明，再确认是否完成。" },
  { id: "manual", label: "人工工单", description: "工单已由人工创建，领取或派发后处理，再由主管确认结果。" },
];
export function requiresApproval(scenario: ApprovalScenario, onsite = false) {
  return onsite || scenario !== "single";
}

export type TaskState = "unclaimed" | "processing" | "review" | "completed";
export function nextTaskState(state: TaskState, scenario: ApprovalScenario, onsite = false): TaskState {
  if (state === "unclaimed") return "processing";
  if (state === "processing") return requiresApproval(scenario, onsite) ? "review" : "completed";
  if (state === "review") return "completed";
  return "completed";
}

export type ContributionPerson = { id: string; name: string };
export type ContributionRecord = {
  id: string;
  type: string;
  owner: ContributionPerson;
  executor?: ContributionPerson;
  onsite: boolean;
  state: TaskState;
  mode: "device" | "ticket";
  deviceCount: number;
  unitScore: number;
  completedAt: string;
};

// These units illustrate the supplied frontend formulas.
export function scenarioScoreRule(scenario: ApprovalScenario) {
  if (scenario === "energy" || scenario === "automation") {
    return { type: scenario === "energy" ? "节能率异常" : "自动率异常", mode: "ticket" as const, unitScore: 5, deviceCount: 0 };
  }
  return { type: "设备掉网", mode: "device" as const, unitScore: 2, deviceCount: scenario === "multiple" ? 2 : 1 };
}

export function contributionExecutor(record: ContributionRecord) {
  return record.onsite ? record.executor : record.owner;
}

export function contributionScore(record: ContributionRecord) {
  if (record.state !== "completed" || !contributionExecutor(record)) return 0;
  return record.unitScore * (record.mode === "device" ? record.deviceCount : 1);
}

export function filterContributionRecords(records: ContributionRecord[], startMonth: string, endMonth: string) {
  return [...new Map(records.map((record) => [record.id, record])).values()].filter((record) => {
    const month = record.completedAt.slice(0, 7);
    return record.state === "completed" && Boolean(contributionExecutor(record)) && Boolean(month)
      && (!startMonth || month >= startMonth) && (!endMonth || month <= endMonth);
  });
}

export function summarizeContributions(records: ContributionRecord[]) {
  type Row = {
    person: ContributionPerson; totalScore: number; deviceScore: number; ticketScore: number;
    executedOrders: number; followedOrders: number; deviceCount: number; lastCompletedAt: string; rank: number;
  };
  const rows = new Map<string, Row>();
  const getRow = (person: ContributionPerson) => {
    let row = rows.get(person.id);
    if (!row) {
      row = { person, totalScore: 0, deviceScore: 0, ticketScore: 0, executedOrders: 0, followedOrders: 0, deviceCount: 0, lastCompletedAt: "", rank: 0 };
      rows.set(person.id, row);
    }
    return row;
  };
  for (const record of filterContributionRecords(records, "", "")) {
    const executor = contributionExecutor(record)!;
    const ownerRow = getRow(record.owner);
    ownerRow.followedOrders++;
    const executionRow = getRow(executor);
    executionRow.executedOrders++;
    const score = contributionScore(record);
    executionRow.totalScore += score;
    if (record.mode === "device") { executionRow.deviceScore += score; executionRow.deviceCount += record.deviceCount; }
    else executionRow.ticketScore += score;
    if (record.completedAt > executionRow.lastCompletedAt) executionRow.lastCompletedAt = record.completedAt;
    if (record.completedAt > ownerRow.lastCompletedAt) ownerRow.lastCompletedAt = record.completedAt;
  }
  return [...rows.values()].sort((a, b) => b.totalScore - a.totalScore || b.executedOrders - a.executedOrders || b.lastCompletedAt.localeCompare(a.lastCompletedAt))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
