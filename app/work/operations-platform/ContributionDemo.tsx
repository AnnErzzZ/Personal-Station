"use client";

import { useRef, useState } from "react";
import NucleoIcon from "./NucleoIcon";
import { PERSONNEL } from "./PersonnelPicker";
import { filterContributionRecords, summarizeContributions, type ContributionRecord } from "./model";
import OperationsWorkspace from "./OperationsWorkspace";
import s from "./page.module.css";
import { OriginalDate, OriginalSelect } from "./OriginalControl";

const SEED: ContributionRecord[] = [
  { id: "WO-1008-01", type: "设备掉网", owner: PERSONNEL[0], onsite: false, state: "completed", mode: "device", deviceCount: 2, unitScore: 2, completedAt: "2026-10-08 09:30" },
  { id: "WO-1007-02", type: "设备误关", owner: PERSONNEL[0], executor: PERSONNEL[1], onsite: true, state: "completed", mode: "device", deviceCount: 3, unitScore: 2, completedAt: "2026-10-07 16:20" },
  { id: "WO-1006-03", type: "节能率异常", owner: PERSONNEL[2], onsite: false, state: "completed", mode: "ticket", deviceCount: 0, unitScore: 5, completedAt: "2026-10-06 14:10" },
  { id: "WO-1005-04", type: "自动率异常", owner: PERSONNEL[1], onsite: false, state: "completed", mode: "ticket", deviceCount: 0, unitScore: 5, completedAt: "2026-10-05 11:00" },
  { id: "WO-0929-05", type: "低电量预警", owner: PERSONNEL[2], executor: PERSONNEL[2], onsite: true, state: "completed", mode: "device", deviceCount: 2, unitScore: 2, completedAt: "2026-09-29 10:40" },
];

export default function ContributionDemo({ records }: { records: ContributionRecord[] }) {
  const [startMonth, setStartMonth] = useState("2026-10");
  const [endMonth, setEndMonth] = useState("2026-10");
  const [personId, setPersonId] = useState(PERSONNEL[0].id);
  const workspaceScroll = useRef<HTMLDivElement>(null);
  const invalidRange = Boolean(startMonth && endMonth && startMonth > endMonth);
  const completed = invalidRange ? [] : filterContributionRecords([...SEED, ...records], startMonth, endMonth);
  const ranking = summarizeContributions(completed);
  const personal = ranking.find((row) => row.person.id === personId);
  const score = ranking.reduce((sum, row) => sum + row.totalScore, 0);
  const highest = ranking[0];
  const participantCount = ranking.filter((row) => row.executedOrders > 0).length;
  return <OperationsWorkspace page="contribution" contentRef={workspaceScroll}><div className={s.contributionDemo} data-contribution-demo>
    <div className={s.demoTop}><div><NucleoIcon name="chart-bar" size={20} /><strong>人员贡献</strong></div></div>
    <div className={s.contributionFilters}>
      <div className={s.componentField}><span>开始月份</span><OriginalDate label="开始月份" month value={startMonth} onChange={setStartMonth} /></div>
      <div className={s.componentField}><span>结束月份</span><OriginalDate label="结束月份" month value={endMonth} onChange={setEndMonth} /></div>
      <button type="button" className={`${s.textButton} ${s.contributionReset}`} onClick={() => { setStartMonth("2026-10"); setEndMonth("2026-10"); setPersonId(PERSONNEL[0].id); }}><NucleoIcon name="refresh" size={16} />重置筛选</button>
    </div>
    {invalidRange && <p className={s.rangeError} role="alert">开始月份不能晚于结束月份，请调整日期。</p>}
    <div className={s.contributionBoards} aria-live="polite">
      <section className={s.teamContributionBoard} aria-label="团队总贡献" data-team-overview>
        <div className={s.contributionBoardHeading}><h3>团队总贡献</h3></div>
        <dl className={s.contributionBoardMetrics}>
          <div><dt><NucleoIcon name="chart-bar" size={16} />贡献得分</dt><dd><strong data-contribution-total>{score}</strong><small>分</small></dd></div>
          <div><dt><NucleoIcon name="clipboard-list" size={16} />完成工单</dt><dd><strong>{completed.length}</strong><small>单</small></dd></div>
          <div><dt><NucleoIcon name="grid-layout" size={16} />处理设备</dt><dd><strong>{ranking.reduce((sum, row) => sum + row.deviceCount, 0)}</strong><small>台</small></dd></div>
        </dl>
        <div className={s.contributionBoardFoot}><div><NucleoIcon name="users" size={16} /><span>贡献人数</span><strong>{participantCount} 人</strong></div><div><span>最高贡献</span><strong>{highest?.person.name ?? "—"}</strong><span>{highest?.totalScore ?? 0} 分</span></div></div>
      </section>
      <section className={s.personalContributionBoard} aria-label="个人贡献" data-personal-contribution>
        <div className={s.contributionBoardHeading}><h3>个人贡献<small data-personal-rank>{personal?.executedOrders ? `团队第 ${personal.rank} 名` : "暂无贡献排名"}</small></h3><OriginalSelect label="统计处理人" value={personId} options={PERSONNEL.map((person) => ({ label: person.name, value: person.id }))} onChange={(value) => setPersonId(String(value))} filterable /></div>
        <dl className={s.contributionBoardMetrics}>
          <div><dt><NucleoIcon name="chart-bar" size={16} />贡献得分</dt><dd><strong data-personal-score>{personal?.totalScore ?? 0}</strong><small>分</small></dd></div>
          <div><dt><NucleoIcon name="clipboard-list" size={16} />完成工单</dt><dd><strong>{personal?.executedOrders ?? 0}</strong><small>单</small></dd></div>
          <div><dt><NucleoIcon name="grid-layout" size={16} />处理设备</dt><dd><strong>{personal?.deviceCount ?? 0}</strong><small>台</small></dd></div>
        </dl>
        <div className={s.contributionBoardFoot}><div><NucleoIcon name="clipboard-list" size={16} /><span>跟进工单</span><strong>{personal?.followedOrders ?? 0} 单</strong></div><div><span>最近完成</span><strong>{personal?.lastCompletedAt || "—"}</strong></div></div>
      </section>
    </div>
    <div className={s.contributionTableScroll}><table className={s.contributionTable}><caption>人员排名 · 按贡献得分排序</caption><thead><tr><th>排名</th><th>处理人</th><th>完成工单数</th><th>设备数</th><th>按设备得分</th><th>按工单得分</th><th>总得分</th><th>跟进工单数</th><th>最近完成时间</th></tr></thead><tbody>{ranking.map((row) => <tr key={row.person.id} data-contribution-person={row.person.id}><td>{row.rank}</td><td><strong>{row.person.name}</strong><small>{row.person.id}</small></td><td>{row.executedOrders} 单</td><td>{row.deviceCount} 台</td><td>{row.deviceScore}</td><td>{row.ticketScore}</td><td><strong>{row.totalScore}</strong></td><td>{row.followedOrders} 单</td><td>{row.lastCompletedAt || "—"}</td></tr>)}{ranking.length === 0 && <tr><td colSpan={9}>这个范围内没有已完成工单。</td></tr>}</tbody></table></div>
  </div></OperationsWorkspace>;
}
