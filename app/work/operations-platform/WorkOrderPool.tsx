import { useState } from "react";
import NucleoIcon from "./NucleoIcon";
import FilterChecklist from "./FilterChecklist";
import s from "./page.module.css";
import { OriginalInput, OriginalDate, OriginalSelect } from "./OriginalControl";
import WorkOrderTable from "./WorkOrderTable";
import { POOL_ORDERS, PROJECT_TYPES, anomalyDays } from "./workOrderData";

const TYPES = ["设备误关", "设备误开", "设备掉网", "低电量预警", "夜间常开", "节能率异常", "自动率异常", "策略变更", "已自动处理"];

export default function WorkOrderPool({ onSelect, orders = POOL_ORDERS, activeId }: { onSelect: (id: string) => void; orders?: typeof POOL_ORDERS; activeId?: string }) {
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState("全部");
  const [types, setTypes] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<string[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [handler, setHandler] = useState("");
  const [keyword, setKeyword] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const hasFilters = Boolean(types.length || orgs.length || projectTypes.length || source || handler || keyword || start || end || status !== "全部");
  const invalid = Boolean(start && end && start > end);
  const filtered = invalid ? [] : orders.filter((row) => (!types.length || types.includes(row.type)) && (!orgs.length || orgs.includes(row.org)) && (!projectTypes.length || projectTypes.includes(row.projectType)) && (!source || row.source === source) && row.handler.includes(handler.trim()) && `${row.id}${row.title}${row.project}`.includes(keyword.trim()) && (!start || row.date >= start) && (!end || row.date <= end));
  const visible = filtered.filter((row) => status === "全部" || row.status === status);
  const processed = filtered.filter((row) => row.status === "已完成");
  const average = processed.length ? (processed.reduce((sum, row) => sum + row.duration, 0) / processed.length).toFixed(1) : "—";
  const reset = () => { setStatus("全部"); setTypes([]); setOrgs([]); setProjectTypes([]); setSource(""); setHandler(""); setKeyword(""); setStart(""); setEnd(""); setSelected([]); };
  const exportRows = () => {
    const rows = visible.filter((row) => selected.includes(row.id));
    const headers = ["状态", "工单编号", "工单标题", "所属组织", "所属项目", "异常类型", "异常持续（最长设备异常）", "处理人", "工单来源", "创建时间", "处理时长（小时）", "累计故障数"];
    const csv = [headers, ...rows.map((row) => [row.status, row.id, row.title, row.org, row.project, row.type, anomalyDays(row), row.handler, row.source, `${row.date} 09:00`, row.duration, row.faults])].map((cells) => cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "工单记录-演示.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const activeSelected = visible.filter((row) => selected.includes(row.id));
  return <div className={s.workOrderPool} data-work-order-pool>
    <div className={s.demoTop}><strong>工单池</strong><div className={s.poolHeaderActions}><span>平均耗时 {average} h</span><div className={s.projectFilterActions}>{hasFilters && <button type="button" className={`${s.textButton} ${s.resetFilterButton}`} aria-label="重置筛选" title="重置筛选" onClick={reset}><NucleoIcon name="refresh" size={16} /></button>}<button type="button" className={s.textButton} aria-expanded={showFilters} aria-controls="work-order-filters" onClick={() => setShowFilters((value) => !value)}><NucleoIcon name="filter" size={15} />{showFilters ? "收起筛选" : "筛选工单"}</button></div></div></div>
    <div className={s.poolToolbar}><div className={s.segments} role="group" aria-label="工单状态">{["全部", "待处理", "处理中", "待审批", "已完成"].map((label) => <button type="button" key={label} aria-pressed={status === label} onClick={() => setStatus(label)}>{label} · {label === "全部" ? filtered.length : filtered.filter((row) => row.status === label).length}</button>)}</div><button type="button" className={s.textButton} disabled={!activeSelected.length} onClick={exportRows}><NucleoIcon name="download" size={15} />导出 CSV{activeSelected.length ? `（${activeSelected.length}）` : ""}</button></div>
    <div className={s.sourceFilters} id="work-order-filters" hidden={!showFilters}>
      <FilterChecklist label="异常类型" options={TYPES} values={types} onChange={setTypes} />
      <FilterChecklist label="项目类型" options={PROJECT_TYPES} values={projectTypes} onChange={setProjectTypes} />
      <FilterChecklist label="所属组织" options={["总部", "分公司", "渠道"]} values={orgs} onChange={setOrgs} />
      <div className={s.componentField}><span>工单来源</span><OriginalSelect label="工单来源" value={source} options={[{ label: "全部来源", value: "" }, ...["系统自动", "人工创建"].map((value) => ({ label: value, value }))]} onChange={(value) => setSource(String(value))} /></div>
      <div className={s.componentField}><span>统计时间 · 开始</span><OriginalDate label="统计开始日期" value={start} onChange={setStart} /></div>
      <div className={s.componentField}><span>统计时间 · 结束</span><OriginalDate label="统计结束日期" value={end} onChange={setEnd} /></div>
      <OriginalInput label="处理人" placeholder="输入处理人姓名" value={handler} onChange={setHandler} />
      <OriginalInput label="关键字" placeholder="工单编号 / 标题 / 项目名称" value={keyword} onChange={setKeyword} />
    </div>
    {invalid && <p className={s.rangeError} role="alert">开始日期不能晚于结束日期。</p>}
    <WorkOrderTable orders={visible} activeId={activeId} onSelect={onSelect} selected={selected} onSelectionChange={setSelected} />
  </div>;
}
