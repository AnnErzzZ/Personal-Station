"use client";

import { useState } from "react";
import NucleoIcon from "./NucleoIcon";
import s from "./page.module.css";

const PROJECT_METRICS = [
  { name: "战略项目", abnormal: 2, total: 6, ratio: "33.3%" },
  { name: "重要项目", abnormal: 2, total: 8, ratio: "25%" },
];
const COMPLETION = [
  { name: "当日", value: 62 },
  { name: "当周", value: 68 },
  { name: "当月", value: 74 },
];

export default function DashboardOverview({ selectedGroup, onSelectGroup }: { selectedGroup: number; onSelectGroup: (index: number) => void }) {
  const [period, setPeriod] = useState(0);
  return <div className={s.appStats} data-dashboard-overview>
    {PROJECT_METRICS.map((item, index) => <button type="button" className={s.projectMetric} key={item.name} aria-pressed={selectedGroup === index}
      aria-label={`查看${item.name}，异常 ${item.abnormal} 个，共 ${item.total} 个`} onClick={() => onSelectGroup(index)}>
      <span className={s.metricHeading}><span>{item.name}</span><NucleoIcon name="arrow-up-right" size={15} /></span>
      <span className={s.projectMetricValue}><strong>{item.abnormal}</strong><span>个异常<small>/ 共 {item.total} 个项目</small></span></span>
      <span className={s.projectMetricSegments} style={{ gridTemplateColumns: `repeat(${item.total}, 1fr)` }} aria-hidden="true">
        {Array.from({ length: item.total }, (_, segment) => <i key={segment} data-abnormal={segment < item.abnormal} />)}
      </span>
      <span className={s.projectMetricFoot}><span>异常占比</span><strong>{item.ratio}</strong></span>
    </button>)}
    <div className={s.completionMetric}>
      <div className={s.completionMetricHeading}><span>工单完成率</span></div>
      <div className={s.completionPeriods} role="group" aria-label="选择工单完成率周期">
        {COMPLETION.map((item, index) => <button type="button" className={s.completionPeriod} key={item.name} aria-pressed={period === index}
          aria-label={`查看${item.name}工单完成率 ${item.value}%`} onClick={() => setPeriod(index)}>
          <span>{item.name}</span><span className={s.completionTrack} aria-hidden="true"><i style={{ width: `${item.value}%` }} /></span><strong>{item.value}%</strong>
        </button>)}
      </div>
    </div>
  </div>;
}
