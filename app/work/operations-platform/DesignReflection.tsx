import c from "./reflection.module.css";
import NucleoIcon, { type NucleoIconName } from "./NucleoIcon";

type Theme = "history" | "ownership" | "approval" | "priority";

const reflections: { theme: Theme; title: string; text: string }[] = [
  { theme: "history", title: "合并当天工单，保留故障历史", text: "当天同项目、同房间、同类异常合成一单，连续天数与复发次数按设备保留。减少重复任务时，仍能判断问题是持续未恢复，还是恢复后再次发生。" },
  { theme: "ownership", title: "分开跟进责任与执行贡献", text: "负责人持续跟进，现场处理人单独记录并获得执行得分。将任务归属与贡献归属分开，避免把协作中的实际工作全部算给负责人。" },
  { theme: "approval", title: "按处理场景分流审批", text: "常规单设备线上处理可直接完成，线下、人工、指标和多设备工单由主管确认。将复核放在这些场景，兼顾处理效率与结果确认。" },
  { theme: "priority", title: "区分项目等级与故障紧迫度", text: "项目等级表示业务重要程度，健康度反映当前异常，工单补充持续天数。让处理顺序同时有业务与异常依据，避免只看工单数量。" },
];

function IconNode({ icon, x, y, label, primary = false }: { icon: NucleoIconName; x: number; y: number; label?: string; primary?: boolean }) {
  return <div className={`${c.node}${primary ? ` ${c.primaryNode}` : ""}`} style={{ left: `${x}%`, top: `${y}%` }}>
    <NucleoIcon name={icon} size={primary ? 42 : 34} />{label && <span>{label}</span>}
  </div>;
}

function Illustration({ theme }: { theme: Theme }) {
  return <div className={`${c.scene}${theme === "priority" ? ` ${c.priorityScene}` : ""}`} role="img" aria-label={{
    history: "同类异常汇入当天工单，设备历史独立保留持续、恢复和复发记录。",
    ownership: "负责人跟进问题，现场处理人执行，分别记录跟进责任与执行贡献。",
    approval: "常规单设备线上工单直接完成，其余指定场景经主管审批后完成。",
    priority: "项目等级和异常紧迫度作为两个维度，共同辅助判断处理顺序。",
  }[theme]} data-reflection-illustration={theme}>
    {theme === "history" && <>
      <svg viewBox="0 0 560 320" className={c.connections} aria-hidden="true"><path d="M164 80H212Q240 80 240 108V132Q240 160 268 160H380M164 160H380M164 240H212Q240 240 240 212V188Q240 160 268 160" /><path d="M392 264H464" className={c.historyTrail} /><circle cx="392" cy="264" r="3" /><circle cx="428" cy="264" r="3" /><circle cx="464" cy="264" r="3" /></svg>
      {[25, 50, 75].map(y => <div className={c.record} key={y} style={{ top: `${y}%` }}><i /><span /><span /></div>)}
      <IconNode icon="clipboard-list" x={76.4} y={50} label="当天工单" primary />
    </>}
    {theme === "ownership" && <>
      <svg viewBox="0 0 560 320" className={c.connections} aria-hidden="true"><path d="M222 144H338" className={c.historyTrail} /></svg>
      <IconNode icon="users" x={31} y={45} label="跟进" primary />
      <IconNode icon="gear" x={69} y={45} label="执行" primary />
    </>}
    {theme === "approval" && <>
      <svg viewBox="0 0 560 320" className={c.connections} aria-hidden="true"><path d="M182 160H240Q304 160 304 96V90Q304 64 330 64H386M240 160Q304 160 304 224V230Q304 256 330 256H386" /></svg>
      <IconNode icon="clipboard-list" x={24} y={50} primary />
      <IconNode icon="check" x={76} y={20} label="直接完成" />
      <IconNode icon="shield-check" x={76} y={80} label="主管审批" />
    </>}
    {theme === "priority" && <div className={c.priorityBoard}>
      <div className={c.metric}><span>项目等级</span><NucleoIcon name="office" size={24} /><strong>战略项目</strong></div>
      <div className={c.metric}><span>项目健康度</span><NucleoIcon name="chart-bar" size={24} /><strong className={c.healthScore}>58<small>/ 100</small></strong></div>
      <div className={c.duration}><span>异常持续</span><div><i /><i /><i /><i /><i /></div></div>
    </div>}
  </div>;
}

export default function DesignReflection() {
  return <div className={c.grid} data-reflection-grid>{reflections.map(({theme,title,text}) => <article className={c.card} key={theme} data-reflection-card={theme}>
    <div className={c.artwork}><Illustration theme={theme}/></div>
    <div className={c.copy}><h3>{title}</h3><p>{text}</p></div>
  </article>)}</div>;
}
