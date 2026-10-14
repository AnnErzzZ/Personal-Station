import type { DeviceHistory } from "./model";

export type RoomDevice = { id: string; name: string; icon: "switch" | "ac-panel" | "sensor" | "radar" };

// Sample history attached to the device detail rows; lighting is a switch button.
export const EVIDENCE_DEVICES: (DeviceHistory & { mac: string; category: string; sensor: string; radar: string })[] = [
  { id: "DEMO-001", name: "会议室开关", project: "南山总部", room: "302 会议室", type: "设备掉网", abnormal: [true, true, true], mac: "DE:00:00:00:00:01", category: "智能开关", sensor: "三合一-A7", radar: "会议室雷达" },
  { id: "DEMO-002", name: "空调面板", project: "南山总部", room: "302 会议室", type: "设备掉网", abnormal: [true, false, true], mac: "DE:00:00:00:00:02", category: "空调", sensor: "温湿度传感器", radar: "会议室雷达" },
];

// Include the room's known bound sensors and radar, without inventing their history.
export const ROOM_DEVICES: RoomDevice[] = [
  { id: "DEMO-001", name: "会议室开关", icon: "switch" },
  { id: "DEMO-002", name: "空调面板", icon: "ac-panel" },
  { id: "ROOM-SENSOR-A7", name: "三合一-A7", icon: "sensor" },
  { id: "ROOM-SENSOR-TH", name: "温湿度传感器", icon: "sensor" },
  { id: "ROOM-RADAR", name: "会议室雷达", icon: "radar" },
];
