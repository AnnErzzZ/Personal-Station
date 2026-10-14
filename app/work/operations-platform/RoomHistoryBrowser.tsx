import Image from "next/image";
import { useId, type KeyboardEvent } from "react";
import { siteAsset } from "@/lib/site-asset";
import AnomalyHistory, { type HistoryTarget } from "./AnomalyHistory";
import { EVIDENCE_DEVICES, ROOM_DEVICES } from "./deviceExamples";
import WorkOrderTable from "./WorkOrderTable";
import { deviceHistoryAt } from "./model";
import type { WorkOrder } from "./workOrderData";
import NucleoIcon from "./NucleoIcon";
import s from "./page.module.css";

export default function RoomHistoryBrowser({ target, onChange, orders, onSelectOrder }: { target: HistoryTarget; onChange: (target: HistoryTarget) => void; orders: WorkOrder[]; onSelectOrder: (id: string) => void }) {
  const id = useId();
  const selectedId = target.kind === "device" ? target.id : "room";
  const selected = ROOM_DEVICES.find((device) => device.id === selectedId);
  const hasHistory = target.kind === "room" || EVIDENCE_DEVICES.some((device) => device.id === selectedId);
  const choose = (value: string) => onChange(value === "room" ? { kind: "room", project: "南山总部", room: "302 会议室" } : { kind: "device", id: value });
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const current = tabs.findIndex((tab) => tab.dataset.historyScope === selectedId);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + tabs.length) % tabs.length;
    const tab = tabs[next];
    choose(tab.dataset.historyScope!);
    tab.focus();
  };
  return <div className={s.roomHistoryLayout}>
    <div className={s.roomHistoryTabs} role="tablist" aria-label="房间历史与设备记录" aria-orientation="vertical" onKeyDown={navigate}>
      <button type="button" role="tab" id={`${id}-room`} aria-selected={selectedId === "room"} aria-controls={`${id}-panel`} tabIndex={selectedId === "room" ? 0 : -1} data-history-scope="room" onClick={() => choose("room")}><NucleoIcon name="clipboard-list" size={22} /><span>历史工单</span></button>
      <div className={s.roomHistoryTabDivider} role="presentation" />
      {ROOM_DEVICES.map((device) => { const evidence = EVIDENCE_DEVICES.find((row) => row.id === device.id); const occurrences = evidence ? deviceHistoryAt(evidence, 2).occurrences : undefined; return <button type="button" role="tab" key={device.id} id={`${id}-${device.id}`} aria-selected={selectedId === device.id} aria-controls={`${id}-panel`} tabIndex={selectedId === device.id ? 0 : -1} data-history-scope={device.id} onClick={() => choose(device.id)}>
        <Image src={siteAsset(`/work/operations-platform/icons/devices/${device.icon}.svg`)} width={28} height={28} alt="" unoptimized />
        <span><span className={s.deviceTabHeading}><span className={s.deviceTabName} title={device.name}>{device.name}</span>{occurrences !== undefined && occurrences > 0 && <span className={s.deviceOccurrences} title={`累计异常次数：${occurrences} 次`} aria-label={`累计异常次数：${occurrences} 次`}><span className={s.deviceOccurrencePrefix}>异常 </span>{occurrences}次</span>}</span><small className={s.deviceMac} title={evidence?.mac}>{evidence?.mac ?? "MAC —"}</small></span>
      </button>; })}
    </div>
    <div className={s.roomHistoryContent} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${selectedId}`} tabIndex={0}>
      {target.kind === "room" ? <section className={s.anomalyHistoryPanel} data-anomaly-history="room"><div className={s.historyRecordHeading}><div><h3>{target.room}</h3><p>{target.project} · 历史工单</p></div></div><WorkOrderTable orders={orders} onSelect={onSelectOrder} /></section> : hasHistory ? <AnomalyHistory devices={EVIDENCE_DEVICES} day={2} target={target} /> : <div className={s.roomHistoryNoRecords}><h3>{selected?.name}</h3><p>暂无异常记录</p></div>}
    </div>
  </div>;
}
