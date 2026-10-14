import NucleoIcon from "./NucleoIcon";
import a from "./landing.module.css";
import r from "./responsibilities-illustration.module.css";

export function CollaborationIllustration({ kind }: { kind: "priority" | "history" | "ownership" }) {
  const labels = {
    priority: "业务示意：按项目重要程度、异常影响与持续时间共同判断处理顺序。",
    history: "业务示意：区分持续未恢复和恢复后再次发生，保留设备异常历史。",
    ownership: "业务示意：工单负责人持续跟进，现场处理人负责实际执行，两项职责分别记录。",
  };
  return <figure className={a.openingIllustration} aria-label={labels[kind]}>
    <div className={a.illustrationScene} aria-hidden="true">
      {kind === "priority" && <div className={a.projectSketch}>
        <div className={a.sketchTabs}><span data-active>项目总览</span><span>异常明细</span></div>
        <div className={a.sketchHeading}><span className={a.sketchIcon}><NucleoIcon name="office" size={21} /></span><div><strong>项目运维清单</strong><small>项目等级与异常影响</small></div></div>
        <div className={a.sketchProjects}>
          <div><NucleoIcon name="office" size={16} /><span>南山总部</span><em data-tone="red"><i />设备掉网</em></div>
          <div><NucleoIcon name="office" size={16} /><span>前海创新园</span><em data-tone="amber"><i />夜间常开</em></div>
          <div><NucleoIcon name="office" size={16} /><span>城东办公楼</span><em data-tone="blue"><i />低电量预警</em></div>
        </div>
        <div className={a.sketchEvidence}><span><NucleoIcon name="filter" size={15} />项目等级</span><span><NucleoIcon name="refresh" size={15} />持续时间</span></div>
      </div>}
      {kind === "history" && <div className={a.rolesSketch}>
        <div className={a.sketchToolbar}><NucleoIcon name="refresh" size={18} /><strong>设备异常记录</strong></div>
        <div className={a.historySketchHeading}><strong>同一设备，持续追踪</strong><small>设备掉网</small></div>
        <div className={a.historySketchTimeline}>
          <div data-state="error"><i /><span>异常发生</span><em>开始记录</em></div>
          <div data-state="error"><i /><span>持续未恢复</span><em>连续累计</em></div>
          <div data-state="recovered"><i /><span>恢复正常</span><em>保留历史</em></div>
          <div data-state="error"><i /><span>再次发生</span><em>次数增加</em></div>
        </div>
      </div>}
      {kind === "ownership" && <div className={a.rolesSketch}>
        <div className={a.sketchToolbar}><NucleoIcon name="clipboard-list" size={18} /><strong>工单处理与记录</strong></div>
        <div className={a.sketchPerson}><span className={a.personAvatar}><NucleoIcon name="users" size={20} /></span><div><strong>工单负责人</strong><small>跟进问题，提交结果</small></div><em>跟进</em></div>
        <div className={a.ownershipConnector}><NucleoIcon name="arrow-right" size={16} /><span>需要到场时，另行安排</span></div>
        <div className={a.sketchPerson}><span className={a.personAvatar} data-role="supervisor"><NucleoIcon name="gear" size={20} /></span><div><strong>现场处理人</strong><small>现场检修，记录操作</small></div><em>执行</em></div>
        <div className={a.sketchShared}><NucleoIcon name="check" size={15} />责任与实际工作分别记录</div>
      </div>}
    </div>
    <figcaption>Case Study 业务示意</figcaption>
  </figure>;
}

export function ResponsibilitiesIllustration({ role }: { role: "engineer" | "supervisor" }) {
  const engineer = role === "engineer";
  return <figure className={r.artwork} data-role-illustration={role}>
    {engineer ? <div className={r.inspectionBoard} role="img" aria-label="核对设备位置与设备关系，并查看运行数据；波形为业务示意。">
      <div className={r.inspectionTile}><span>设备位置</span><NucleoIcon name="office" size={32} /><i /></div>
      <div className={r.inspectionTile}><span>设备关系</span><NucleoIcon name="grid-layout" size={32} /><i /></div>
      <div className={r.tracePanel}><span>运行数据</span>
        <svg viewBox="0 0 440 150" aria-hidden="true" className={r.trace}>
          <g className={r.chartGrid}><path d="M8 30H432M8 75H432M8 120H432" /></g>
          <path className={r.chartArea} d="M8 111L25 106L42 110L59 94L76 98L93 69L110 79L127 68L144 87L161 65L178 75L195 37L212 58L229 24L246 60L263 68L280 55L297 82L314 72L331 91L348 62L365 76L382 95L399 86L416 105L432 97V140H8Z" />
          <path className={r.chartLine} d="M8 111L25 106L42 110L59 94L76 98L93 69L110 79L127 68L144 87L161 65L178 75L195 37L212 58L229 24L246 60L263 68L280 55L297 82L314 72L331 91L348 62L365 76L382 95L399 86L416 105L432 97" />
        </svg>
        <div className={r.traceTicks}><i /><i /><i /><i /></div>
      </div>
    </div> : <div className={r.integrationScene} role="img" aria-label="运维主管连接工单派发、结果审批和贡献核对。">
      <svg viewBox="0 0 560 320" className={r.connectors} aria-hidden="true"><path d="M182 160H258Q336 160 336 92V90Q336 58 368 58H384M258 160H436M258 160Q336 160 336 228V230Q336 262 368 262H384" /></svg>
      <div className={`${r.node} ${r.rootNode}`}><NucleoIcon name="users" size={46} /></div>
      <div className={`${r.node} ${r.dispatchNode}`}><NucleoIcon name="clipboard-list" size={36} /></div>
      <div className={`${r.node} ${r.approvalNode}`}><NucleoIcon name="shield-check" size={36} /></div>
      <div className={`${r.node} ${r.contributionNode}`}><NucleoIcon name="chart-bar" size={36} /></div>
    </div>}
  </figure>;
}
