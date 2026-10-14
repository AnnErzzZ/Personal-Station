import { DAYS, deviceAnomalyEpisodes, deviceHistoryAt, type DeviceHistory } from "./model";
import s from "./page.module.css";

export type HistoryTarget = { kind: "device"; id: string } | { kind: "room"; project: string; room: string };

export default function AnomalyHistory({ devices, day, target }: { devices: DeviceHistory[]; day: number; target: HistoryTarget }) {
  const device = target.kind === "device" ? devices.find((row) => row.id === target.id) : undefined;
  if (!device) return null;
  const history = deviceHistoryAt(device, day);
  const repeated = Boolean(history && history.occurrences > 1 && history.continuousDays === 1);
  const abnormal = device?.abnormal[day];
  return <section className={s.anomalyHistoryPanel} data-anomaly-history="device" data-history-device={device.id} aria-label={`${device.name}异常历史`}>
    <div className={s.historyRecordHeading}><div><h3>{device.name}</h3><p>异常历史 · {device.id} · 累计异常次数 {history.occurrences} 次</p></div></div>
    <p className={s.historyFinding}>{!abnormal ? "设备已恢复，历史记录继续保留。" : repeated ? "恢复后再次出现异常，需要排查复发原因。" : `异常已连续 ${history.continuousDays} 天，尚未恢复。`}</p>
    <div className={s.evidenceScroll}><table className={s.historyRecordsTable}><caption>全部异常记录 · 截至 {DAYS[day]}</caption><thead><tr><th>开始日期</th><th>异常类型</th><th>恢复日期</th><th>连续异常</th><th>当前结果</th></tr></thead><tbody>{deviceAnomalyEpisodes(device, day).map((episode) => <tr key={episode.start}><td>{DAYS[episode.start]}</td><td>{device.type}</td><td>{episode.recovered === null ? "--" : DAYS[episode.recovered]}</td><td>{episode.days} 天</td><td>{episode.recovered === null ? "未恢复" : "已恢复"}</td></tr>)}</tbody></table></div>
  </section>;
}
