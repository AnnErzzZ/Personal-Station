import { type ReactNode, type RefObject } from "react";
import NucleoIcon, { type NucleoIconName } from "./NucleoIcon";
import s from "./page.module.css";

type WorkspacePage = "pool" | "detail" | "history" | "contribution";
const modules: [NucleoIconName, string][] = [
  ["office", "项目管理"], ["chart-bar", "统计与台账"],
  ["users", "组织与权限"], ["gear", "配置中心"],
];

export default function OperationsWorkspace({ page, children, contentRef }: {
  page: WorkspacePage; children: ReactNode; contentRef: RefObject<HTMLDivElement | null>;
}) {
  const title = page === "pool" ? "工单池" : page === "detail" ? "工单详情" : page === "history" ? "异常记录" : "贡献统计";
  return <div className={s.workspaceFrame} data-workspace={page} role="region" aria-label={`${title}完整页面`}>
    <aside className={`${s.appSidebar} ${s.workspaceSidebar}`} aria-label={`${title}工作台导航`}>
      <div className={s.appBrand}><span className={s.brandMark}><i /><i /><i /></span><strong>HEYI<span>运维工作台</span></strong></div>
      <nav className={s.appNavigation} data-static-nav aria-label={`${title}工作空间`}>
        <div className={s.appNavItem}><NucleoIcon name="grid-layout" /><span>工作台</span></div>
        <div className={s.appNavItem} data-selected="true"><NucleoIcon name="clipboard-list" /><span>工单管理</span><NucleoIcon name="chevron-right" className={s.workspaceMenuChevron} size={14} /></div>
        <div className={`${s.appSubnav} ${s.workspaceSubnav}`}>
          <span data-selected={page === "pool"} aria-current={page === "pool" ? "page" : undefined}>工单池</span>
          <span data-selected={page === "detail" || page === "history"} aria-current={page === "detail" || page === "history" ? "page" : undefined}>我的工单</span>
          <span>工单审批</span>
          <span data-selected={page === "contribution"} aria-current={page === "contribution" ? "page" : undefined}>贡献统计</span>
        </div>
        {modules.map(([icon, label]) => <div className={s.appNavItem} key={label}><NucleoIcon name={icon} /><span>{label}</span></div>)}
      </nav>
      <div className={s.appProfile}><span>林</span><div>林工程师<small>运维工程师</small></div></div>
    </aside>
    <div className={s.workspaceMain}>
      <header className={s.workspaceTopbar}>
        <nav className={s.workspaceBreadcrumb} aria-label="页面位置">
          <span className={s.workspaceTrail}>工作台<NucleoIcon name="chevron-right" size={13} />工单管理<NucleoIcon name="chevron-right" size={13} /></span>
          <strong aria-current="page">{title}</strong>
        </nav>
        <div className={s.workspaceAccount}><NucleoIcon name="bell" size={17} /><span className={s.avatar}>林</span></div>
      </header>
      <div className={s.workspaceScroll} ref={contentRef} tabIndex={0} aria-label={`${title}页面内容`}>{children}</div>
    </div>
  </div>;
}
