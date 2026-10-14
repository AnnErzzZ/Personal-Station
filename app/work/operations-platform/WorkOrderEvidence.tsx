import { useRef, useState, type ReactNode } from "react";
import NucleoIcon from "./NucleoIcon";
import s from "./page.module.css";
import OperationsWorkspace from "./OperationsWorkspace";
import WorkOrderPool from "./WorkOrderPool";
import { POOL_ORDERS, ROOM_HISTORY_ORDERS, orderDay } from "./workOrderData";
import OriginalControl, { OriginalSelect } from "./OriginalControl";
import { PERSONNEL } from "./PersonnelPicker";
import { siteAsset } from "@/lib/site-asset";
import type { HistoryTarget } from "./AnomalyHistory";
import RoomHistoryBrowser from "./RoomHistoryBrowser";
import { type ContributionRecord, deviceHistoryAt } from "./model";
import { EVIDENCE_DEVICES } from "./deviceExamples";
import { usePrototypeExperience } from "./PrototypeExperience";

const TYPES = ["设备掉网", "节能率异常", "自动率异常", "策略变更"];
const STATUS = ["待处理", "处理中", "已完成", "待审批"];
const ROOM_HISTORY: HistoryTarget = { kind: "room", project: "南山总部", room: "302 会议室" };


export default function WorkOrderEvidence({ children, onComplete }: { onComplete: (record: ContributionRecord) => void; children: (panels: { pool: ReactNode; detail: ReactNode; history: ReactNode }) => ReactNode }) {
  const { open } = usePrototypeExperience();
  const poolScroll = useRef<HTMLDivElement>(null);
  const detailScroll = useRef<HTMLDivElement>(null);
  const historyScroll = useRef<HTMLDivElement>(null);
  const historyOrigin = useRef<{ contentY: number; focus: HTMLElement | null; orderId: string } | null>(null);
  const poolOrigin = useRef<{ focus: HTMLElement | null } | null>(null);
  const backToPool = () => {
    const origin = poolOrigin.current;
    open("work-orders");
    requestAnimationFrame(() => origin?.focus?.focus({ preventScroll: true }));
  };
  const goToDetail = () => open("ownership");
  const [type, setType] = useState(0);
  const [scope, setScope] = useState(0);
  const [status, setStatus] = useState(1);
  const [orders, setOrders] = useState([...POOL_ORDERS, ...ROOM_HISTORY_ORDERS.slice(1)]);
  const [selectedId, setSelectedId] = useState(POOL_ORDERS[0].id);
  const [method, setMethod] = useState("现场处理");
  const [executor, setExecutor] = useState(PERSONNEL[1]);
  const [description, setDescription] = useState("设备离线，需核对网络连接和现场供电。");
  const [remark, setRemark] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget>(ROOM_HISTORY);
  const openHistory = (target: HistoryTarget) => {
    historyOrigin.current = { contentY: detailScroll.current?.scrollTop ?? 0,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement : null, orderId: selectedId };
    setHistoryTarget(target);
    open("history");
    requestAnimationFrame(() => {
      if (historyScroll.current) historyScroll.current.scrollTop = 0;
      document.querySelector<HTMLButtonElement>('[data-workspace="history"] [data-workspace-back]')?.focus({ preventScroll: true });
    });
  };
  const backToDetail = () => {
    const origin = historyOrigin.current;
    goToDetail();
    if (origin && origin.orderId === selectedId) {
      requestAnimationFrame(() => { if (detailScroll.current) detailScroll.current.scrollTop = origin.contentY; origin.focus?.focus({ preventScroll: true }); });
    }
  };
  const [savedRecords, setSavedRecords] = useState<Record<string, { method: string; executor: typeof PERSONNEL[number]; description: string; remark: string; files: string[] }>>({});
  const order = orders.find((row) => row.id === selectedId)!;
  const day = orderDay(order);
  const devices = EVIDENCE_DEVICES.filter((device) => device.abnormal[day]);
  const onsite = type === 0 && method !== "线上处理";
  const selectOrder = (id: string) => {
    const row = orders.find((item) => item.id === id)!;
    const next = TYPES.indexOf(row.type);
    const saved = savedRecords[row.id];
    setSelectedId(id); setType(next); setHistoryTarget(ROOM_HISTORY); setStatus(STATUS.indexOf(row.status));
    setMethod(saved?.method ?? (next === 0 ? "现场处理" : "线上处理")); setExecutor(saved?.executor ?? PERSONNEL[1]);
    setDescription(saved?.description ?? (next === 0 ? "设备离线，需核对网络连接和现场供电。" : ""));
    setRemark(saved?.remark ?? ""); setFiles(saved?.files ?? []); setNotice("");
  };
  const openOrder = (id: string) => {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (focus?.closest('[data-workspace="pool"]')) poolOrigin.current = { focus };
    selectOrder(id); historyOrigin.current = null;
    requestAnimationFrame(() => { if (detailScroll.current) detailScroll.current.scrollTop = 0; goToDetail(); });
  };
  const saveRecord = () => setSavedRecords((previous) => ({ ...previous, [order.id]: { method, executor, description, remark, files } }));
  const updateStatus = (next: number) => { setStatus(next); setOrders((previous) => previous.map((row) => row.id === order.id ? { ...row, status: STATUS[next], handler: next === 0 ? "--" : row.handler === "--" ? "林工程师" : row.handler } : row)); };
  const needsApproval = onsite || type !== 0 || devices.length > 1;
  const completeOrder = () => {
    saveRecord(); updateStatus(2); setNotice("工单已完成，处理记录已归档。");
    const owner = PERSONNEL.find((person) => person.name === order.handler) ?? PERSONNEL[0];
    onComplete({ id: order.id, type: order.type, owner, executor: onsite ? executor : owner, onsite, state: "completed",
      mode: type === 0 ? "device" : "ticket", deviceCount: type === 0 ? devices.length : 0, unitScore: type === 0 ? 2 : 5, completedAt: `${order.date} 10:00` });
  };
  const projectLevel = type === 1 || (type === 2 && scope === 0);
  const info = [
    ["工单编号", order.id], ["工单标题", order.title],
    ["所属项目", order.project], ["工单来源", order.source],
    ...(type === 3 ? [["所属组织", order.org]] : []),
    ["楼栋", projectLevel ? "-" : "A 栋"], ["楼层", projectLevel ? "-" : "3 层"], ["区域", projectLevel ? "-" : "302 会议室"],
    ["关联设备", type === 1 ? "--" : type === 0 ? `${devices.length} 台` : "2 台"],
    ["创建时间", `${order.date} 09:00`], ["持续时间", order.duration ? `${Math.floor(order.duration)} 小时 ${Math.round((order.duration % 1) * 60)} 分` : "--"],
    ["累计故障数", projectLevel ? "-" : type === 2 ? "12" : order.faults], ["当前状态", STATUS[status]],
    ["工单负责人", order.handler], ["现场处理人", onsite ? executor.name : "-"],
  ];

  const pool = <WorkOrderPool orders={orders.filter((row) => POOL_ORDERS.some((item) => item.id === row.id))} activeId={order.id} onSelect={openOrder} />;
  const detail = <div className={s.evidence} data-work-order-evidence data-current-order={order.id}>
    <div className={s.demoTop}><div><button type="button" className={s.workspaceBack} data-workspace-back="pool" onClick={backToPool} aria-label="返回工单池" title="返回工单池"><NucleoIcon name="arrow-right" size={20} /></button><strong>{order.title}</strong></div><span className={s.tag} data-tone={status === 2 ? "green" : status === 1 ? "blue" : "neutral"}>{STATUS[status]}</span></div>
    {type === 2 && <div className={s.scopeSwitch} role="group" aria-label="自动率异常层级">
      {["项目级", "房间级"].map((name, index) => <button type="button" key={name} aria-pressed={scope === index} onClick={() => setScope(index)}>{name}</button>)}
    </div>}
    <div id="complete-order-info" className={s.orderInformation}><dl className={s.evidenceInfo}>{info.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
    <div className={s.evidenceBody} aria-live="polite">
      {type === 0 && <><div className={s.trackingDeviceHeading}><h3>异常设备明细</h3><button type="button" className={s.textButton} onClick={() => openHistory({ kind: "room", project: "南山总部", room: "302 会议室" })}>房间异常历史<NucleoIcon name="chevron-right" size={14} /></button></div><div className={s.evidenceScroll}><table><thead><tr><th>MAC 地址</th><th>设备名称</th><th>设备类型</th><th>绑定传感器</th><th>绑定雷达</th><th>连续异常</th><th>累计异常次数</th><th>操作</th></tr></thead><tbody>
        {devices.map((device) => { const history = deviceHistoryAt(device, day); return <tr key={device.id}><td>{device.mac}</td><td>{device.name}</td><td>{device.category}</td><td>{device.sensor}</td><td>{device.radar}</td><td>{history.continuousDays} 天</td><td>{history.occurrences} 次</td><td><button type="button" className={s.textButton} onClick={() => openHistory({ kind: "device", id: device.id })}>查看历史<NucleoIcon name="chevron-right" size={14} /></button></td></tr>; })}
      </tbody></table></div><p>支持单台或批量设备重连。</p></>}
      {type === 1 && <><h3>节能率异常明细</h3><div className={s.evidenceMetrics}><div><span>当前节能率</span><strong>12.8<small>%</small></strong></div><div><span>正常节能率</span><strong>15～35<small>%</small></strong></div></div><p>统计周期：10 月 1 日至 10 月 7 日。保留触发时的数值与区间，排查后可调整节能参数。</p></>}
      {type === 2 && <><h3>自动率异常明细</h3><div className={s.evidenceMetrics}><div><span>实际自动率</span><strong>72.4<small>%</small></strong></div><div><span>监测阈值</span><strong>80<small>%</small></strong></div></div><div className={s.evidenceScroll}><table><thead><tr><th>指标项</th><th>灯光</th><th>空调</th><th>其他设备</th></tr></thead><tbody>{[["自动率", "75%", "69.8%", "--"], ["总控制次数", "500", "500", "--"], ["自动执行次数", "375", "349", "--"], ["自动开启次数", "190", "175", "--"], ["自动关闭次数", "185", "174", "--"], ["手动控制次数", "125", "151", "--"], ["手动开启次数", "65", "80", "--"], ["手动关闭次数", "60", "71", "--"]].map(([label, ...values]) => <tr key={label}><td>{label}</td>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div><p>统计周期：10 月 1 日至 10 月 7 日。自动率为自动执行次数占总控制次数的比例，灯光、空调和其他设备分别统计。</p></>}
      {type === 3 && <><h3>策略变更明细</h3><dl className={s.evidenceInfo}>{[["操作时间", "2026-10-07 08:45"], ["变更类型", "参数调整"], ["操作用户", "林工程师"], ["用户角色", "运维工程师"], ["受影响设备数", "2 台"], ["变更结果", "执行成功"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3 className={s.sourceModuleTitle}>变更内容</h3><div className={s.evidenceScroll}><table><thead><tr><th>策略名称</th><th>修改字段</th><th>修改前</th><th>修改后</th></tr></thead><tbody><tr><td>会议室无人节能</td><td>无人延迟</td><td>10 分钟</td><td>15 分钟</td></tr></tbody></table></div><h3 className={s.sourceModuleTitle}>受影响设备</h3><div className={s.evidenceScroll}><table><thead><tr><th>设备名称</th><th>MAC 地址</th><th>设备类型</th><th>影响结果</th></tr></thead><tbody><tr><td>会议室开关</td><td>DE:00:00:00:00:01</td><td>智能开关</td><td>控制参数更新成功</td></tr><tr><td>空调面板</td><td>DE:00:00:00:00:02</td><td>空调</td><td>控制参数更新成功</td></tr></tbody></table></div><details className={s.supportDetails}><summary>设备受影响详情 · 会议室开关</summary><dl className={s.evidenceInfo}>{[["设备编号", "DEMO-001"], ["所属房间", "302 会议室"], ["所属楼栋", "A 栋"], ["所属区域", "3 层会议区"], ["修改前控制值", "无人延迟 10 分钟"], ["修改后控制值", "无人延迟 15 分钟"], ["绑定变化", "-"], ["执行时间", "2026-10-07 08:45"], ["失败原因", "-"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details></>}
    </div>
    <section className={s.recordSection} id="approval"><div className={s.recordHeader}><h3><NucleoIcon name="paperclip" size={19} />处理记录</h3></div><div id="order-processing-record" className={s.recordEditor}>
    <div className={s.recordForm}>
      <div className={s.componentField} data-record-field="owner"><span>工单负责人</span><OriginalControl options={{ kind: "select", label: "工单负责人", value: order.handler, options: [{ label: order.handler, value: order.handler }], disabled: true }} /></div>
      <div className={s.componentField} data-record-field="method"><span>处理方式</span><OriginalSelect label="处理方式" value={method} disabled={status !== 1} options={["线上处理", "现场处理", "更换设备"].map((value) => ({ label: value, value }))} onChange={(value) => setMethod(String(value))} /></div>
      {needsApproval && <div className={s.componentField} data-record-field="approver"><span>审批者</span><OriginalControl options={{ kind: "select", label: "审批者", value: "某某主管", options: [{ label: "某某主管", value: "某某主管" }], disabled: true }} /></div>}
      {onsite && <div className={s.componentField} data-record-field="executor"><span>现场处理人</span><OriginalSelect label="现场处理人" value={executor.id} disabled={status !== 1} options={PERSONNEL.map((person) => ({ label: `${person.name} · ${person.id}`, value: person.id }))} onChange={(value) => { const selected = PERSONNEL.find((person) => person.id === value); if (selected) setExecutor(selected); }} /></div>}
      <label className={s.recordWide}>问题描述<textarea value={description} disabled={status !== 1} onChange={(event) => setDescription(event.target.value)} placeholder="补充人工分析、现场情况或排查结论" /></label>
      <label className={s.recordWide}>备注<textarea value={remark} disabled={status !== 1} onChange={(event) => setRemark(event.target.value)} placeholder="记录处理说明、回归结论或待跟进事项" /></label>
      <div className={s.recordWide} data-record-field="attachments"><span>附件资源</span><OriginalControl options={{ kind: "upload", value: files, disabled: status !== 1, addIcon: siteAsset("/work/operations-platform/icons/attachment-plus.svg") }} onChange={(value) => setFiles(value as string[])} /></div>
    </div>
    <div className={s.recordActions}>{status === 0 && <button type="button" className={s.primaryButton} onClick={() => { updateStatus(1); setNotice("已开始处理这张演示工单。"); }}>开始处理</button>}{status === 1 && <><button type="button" className={s.primaryButton} onClick={() => { saveRecord(); setNotice("处理记录已保存在本页演示中。"); }}>保存</button><button type="button" className={s.secondaryButton} onClick={() => { updateStatus(0); setNotice("已取消处理，工单回到待处理。"); }}>取消处理</button><button type="button" className={s.secondaryButton} disabled={!description.trim()} onClick={() => { if (needsApproval) { saveRecord(); updateStatus(3); setNotice("处理结果已提交，等待主管审批。"); } else completeOrder(); }}>{needsApproval ? "提交审批" : "标记完成"}</button></>}{status === 3 && <><button type="button" className={s.primaryButton} onClick={completeOrder}>主管审批通过</button><button type="button" className={s.secondaryButton} onClick={() => { updateStatus(1); setNotice("已退回，补充处理记录后再次提交。"); }}>退回补充</button></>}<p aria-live="polite">{notice}</p></div>
    </div></section>
  </div>;
  const history = <div className={s.historyDemo} data-history-work-order={order.id}>
    <div className={s.demoTop}><div><button type="button" className={s.workspaceBack} data-workspace-back="detail" onClick={backToDetail} aria-label="返回工单详情" title="返回工单详情"><NucleoIcon name="arrow-right" size={20} /></button><strong>{order.title}</strong></div><span className={s.trackingOrderId}>{order.id}</span></div>
    {type === 0 ? <>
      <RoomHistoryBrowser target={historyTarget} onChange={setHistoryTarget} orders={ROOM_HISTORY_ORDERS.map((sample) => orders.find((row) => row.id === sample.id)!)} onSelectOrder={openOrder} />
    </> : <p className={s.historyEmpty}>当前工单暂无可展示的设备或房间历史。可从工单池选择“302 会议室设备掉网”查看异常记录示例。</p>}
  </div>;
  return children({
    pool: <OperationsWorkspace page="pool" contentRef={poolScroll}>{pool}</OperationsWorkspace>,
    detail: <OperationsWorkspace page="detail" contentRef={detailScroll}>{detail}</OperationsWorkspace>,
    history: <OperationsWorkspace page="history" contentRef={historyScroll}>{history}</OperationsWorkspace>,
  });
}

