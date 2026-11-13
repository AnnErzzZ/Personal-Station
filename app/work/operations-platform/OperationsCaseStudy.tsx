"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  IconArrowRight, IconArrowUpRight,
} from "@tabler/icons-react";
import { healthLabel, type ContributionRecord } from "./model";
import s from "./page.module.css";
import a from "./landing.module.css";
import WorkJourney from "./WorkJourney";
import { PrototypeExperience, PrototypeLaunch, PrototypePreview, usePrototypeExperience, type PrototypeId } from "./PrototypeExperience";
import WorkOrderEvidence from "./WorkOrderEvidence";
import ContributionDemo from "./ContributionDemo";
import FilterChecklist from "./FilterChecklist";
import OriginalControl, { OriginalInput, OriginalSelect } from "./OriginalControl";
import DashboardOverview from "./DashboardOverview";
import PriorityCriteria from "./PriorityCriteria";
import InterfaceStandards from "./InterfaceStandards";
import NucleoIcon, { type NucleoIconName } from "./NucleoIcon";
import { siteAsset } from "@/lib/site-asset";
import { CollaborationIllustration, ResponsibilitiesIllustration } from "./OpeningIllustrations";
import OperationsHero from "./OperationsHero";
import WorkflowDiagram from "./WorkflowDiagram";
import DesignReflection from "./DesignReflection";
import HistoryCriteria from "./HistoryCriteria";
import ClosingSequence from "./ClosingSequence";

const PROJECTS = [
  { id: "PRJ-001", name: "南山总部", grade: "战略项目", score: 58, orders: 4, system: "3.0", category: "正式项目", belong: "总部", deploy: "公网部署", details: [["设备掉网", 35, 3, "1 / 3 已完成"], ["自动率异常", 7, 1, "0 / 1 已完成"]] },
  { id: "PRJ-002", name: "滨江研发中心", grade: "战略项目", score: 82, orders: 2, system: "3.0", category: "试点项目", belong: "分公司", deploy: "本地化部署", details: [["设备误关", 12, 1, "0 / 1 已完成"], ["策略变更", 6, 1, "1 / 1 已完成"]] },
  { id: "PRJ-003", name: "前海创新园", grade: "重要项目", score: 69, orders: 3, system: "2.0", category: "正式项目", belong: "渠道", deploy: "公网部署", details: [["夜间常开", 23, 2, "1 / 2 已完成"], ["节能率异常", 8, 1, "0 / 1 已完成"]] },
  { id: "PRJ-004", name: "城东办公楼", grade: "重要项目", score: 74, orders: 5, system: "3.0", category: "正式项目", belong: "分公司", deploy: "本地化部署", details: [["低电量预警", 18, 3, "2 / 3 已完成"], ["设备误开", 8, 2, "1 / 2 已完成"]] },
];

function Chapter({ id, title, intro, children, layout = "rail" }: {
  id: string; title: string; intro: string; children: ReactNode;
  layout?: "opening" | "rail" | "wide" | "closing";
}) {
  const prototype = ["priority", "work-orders", "ownership", "history", "contribution"].includes(id) ? id as PrototypeId : null;
  return <section id={id} className={`${a.chapter}${prototype ? ` ${a.showcase}` : ""}`} data-case-chapter={id} data-case-layout={layout} data-operations-dark={id === "reflection" ? true : undefined} aria-labelledby={`${id}-title`}>
    <header className={a.chapterHeading}>
      <h2 id={`${id}-title`}>{title}</h2><div className={a.chapterDescription}><p>{intro}</p>{prototype && <PrototypeLaunch id={prototype} />}</div>
    </header>
    <div className={a.chapterBody}>{children}</div>
  </section>;
}
function Segments({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: number; onChange: (index: number) => void;
}) {
  return <div className={s.segments} role="group" aria-label={label}>
    {options.map((option, index) => <button type="button" key={option} aria-pressed={selected === index}
      onClick={() => onChange(index)}>{option}</button>)}
  </div>;
}

function Dashboard() {
  const { open } = usePrototypeExperience();
  const [filter, setFilter] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState(0);
  const [sortField, setSortField] = useState<"score" | "orders">("score");
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const filters = ["战略项目", "重要项目"];
  const rows = PROJECTS.filter((project) => project.grade === filters[filter] && project.name.includes(keyword.trim()))
    .filter((project) => Object.entries(facets).every(([key, values]) => !values.length || (key === "exception" ? project.details.some(([type]) => values.includes(String(type))) : values.includes(String(project[key as "category" | "belong" | "deploy" | "system"])))))
    .sort((a, b) => sort === 1 ? a[sortField] - b[sortField] : sort === 2 ? b[sortField] - a[sortField] : 0);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = Boolean(keyword.trim()) || Object.values(facets).some((values) => values.length > 0);
  const changeSort = (field: "score" | "orders") => { setSortField(field); setSort((value) => sortField === field ? (value + 1) % 3 : 1); };
  return <div className={s.dashboard} data-dashboard>
    <aside className={s.appSidebar} aria-label="运维平台导航">
      <div className={s.appBrand}><span className={s.brandMark}><i /><i /><i /></span><strong>HEYI<span>运维工作台</span></strong></div>
      <nav className={s.appNavigation} data-static-nav aria-label="工作空间">
        <div className={s.appNavItem} data-selected="true"><NucleoIcon name="grid-layout" size={18} />工作台</div>
        <div className={s.appNavItem}><NucleoIcon name="clipboard-list" size={18} />工单管理<NucleoIcon name="chevron-right" className={s.appMenuChevron} size={14} /></div>
        {[["office", "项目管理"], ["chart-bar", "统计与台账"], ["users", "组织与权限"], ["gear", "配置中心"]].map(([icon, text]) => <div className={s.appNavItem} key={text}><NucleoIcon name={icon as NucleoIconName} size={18} />{text}</div>)}
      </nav>
      <div className={s.appProfile}><span>林</span><div>林工程师<small>运维工程师</small></div></div>
    </aside>
    <div className={s.appContent}>
      <div className={s.appTop}><span>工作台 <NucleoIcon name="chevron-right" size={13} /> 项目总览</span><span><NucleoIcon name="bell" size={17} /><span className={s.avatar}>林</span></span></div>
      <div className={s.mobileWorkMenu} data-static-nav><div className={s.staticMenuHeading}><NucleoIcon name="clipboard-list" size={16} />工单管理<NucleoIcon name="chevron-right" className={s.appMenuChevron} size={14} /></div></div>
      <div className={s.appHeading}><h3>待处理项目</h3><a href="#work-orders" className={s.textButton} onClick={(event) => { event.preventDefault(); open("work-orders"); }}>进入工单池<NucleoIcon name="arrow-right" size={14} /></a></div>
      <DashboardOverview selectedGroup={filter} onSelectGroup={(index) => { setFilter(index); setPage(1); }} />
      <div className={s.appTableHeading}><h4>项目运维清单</h4><div className={s.projectFilterActions}>{hasFilters && <button type="button" className={`${s.textButton} ${s.resetFilterButton}`} aria-label="重置筛选" title="重置筛选" onClick={() => { setFacets({}); setKeyword(""); setPage(1); }}><NucleoIcon name="refresh" size={16} /></button>}<button type="button" className={s.textButton} aria-expanded={showFilters} onClick={() => setShowFilters((value) => !value)}><NucleoIcon name="filter" size={15} />{showFilters ? "收起筛选" : "筛选项目"}</button></div></div>
      <Segments label="选择项目分组" options={filters} selected={filter} onChange={setFilter} />
      {showFilters && <div className={s.sourceFilters} data-project-filters>{[
        ["exception", "异常类型", ["设备掉网", "设备误关", "设备误开", "夜间常开", "低电量预警", "节能率异常", "自动率异常", "策略变更", "已自动处理"]],
        ["category", "项目分类", ["正式项目", "试点项目", "展厅测试项目"]], ["belong", "项目归属", ["总部", "分公司", "渠道"]],
        ["deploy", "部署方式", ["公网部署", "本地化部署"]], ["system", "项目系统版本", ["2.0", "3.0"]],
      ].map(([key, label, options]) => <FilterChecklist key={String(key)} label={String(label)} options={options as string[]} values={facets[String(key)] ?? []} onChange={(values) => { setFacets((previous) => ({ ...previous, [String(key)]: values })); setPage(1); }} />)}<OriginalInput label="项目名称" value={keyword} onChange={(value) => { setKeyword(value); setPage(1); }} placeholder="输入项目名称搜索" /></div>}
      <OriginalControl className={s.projectTableHost} options={{ kind: "project-table", rows: visibleRows.map((project) => ({ ...project, healthLabel: healthLabel(project.score) })), expanded, offset: (currentPage - 1) * pageSize, sort, sortField, sprite: siteAsset("/work/operations-platform/icons/nucleo.svg?sort=fill") }} onChange={(value) => { const action = value as { type: "expand"; id: string } | { type: "sort"; field: "score" | "orders" }; if (action.type === "expand") setExpanded((previous) => previous === action.id ? null : action.id); else changeSort(action.field); }} />
      <div className={s.sourcePagination}><span>共 {rows.length} 个项目</span><div className={s.pageSizePicker}><span>每页</span><OriginalSelect label="每页条数" value={pageSize} options={[1, 10, 20, 50].map((value) => ({ label: `${value} 条`, value }))} onChange={(value) => { setPageSize(Number(value)); setPage(1); }} /></div><OriginalControl options={{ kind: "pagination", page: currentPage, total: rows.length, pageSize }} onChange={(value) => setPage(Number(value))} /></div>
    </div>
  </div>;
}

export default function OperationsCaseStudy() {
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  return <PrototypeExperience><div className={`${s.page} ${a.page}`} data-case-landing>
    <OperationsHero />
    <div className={a.content}>
      <div className={a.openingSpread} data-case-opening>
      <Chapter id="background" layout="opening" title="高密度后台的信息层级" intro="项目、房间与设备异常集中在同一后台，处理过程涉及多人协作。界面需要区分项目概览、设备明细和人员记录，让阅读顺序与操作入口清晰可辨。">
        <ol className={a.problemRows}>
          {([
            ["priority", "先处理什么", "项目重要程度、异常影响和持续时间不同，需要共同判断处理顺序。"],
            ["history", "问题是否反复", "当天的异常列表无法完整说明问题，还需要查看持续天数与历史发生次数。"],
            ["ownership", "谁跟进，谁执行", "工单负责人和现场处理人可能不同，需要分别记录责任与实际工作。"],
          ] as const).map(([kind, title, text]) => <li key={kind}><CollaborationIllustration kind={kind} /><div className={a.openingCardCopy}><h3>{title}</h3><p>{text}</p></div></li>)}
        </ol>
      </Chapter>
      <Chapter id="users" layout="opening" title="按角色组织信息与操作" intro="工程师侧重设备依据与处理记录，主管侧重任务进度与审批。按角色组织需要查看的字段和可执行操作，领取入口同时面向两种角色。">
        <div className={a.roleCards} data-role-cards>
          <article><ResponsibilitiesIllustration role="engineer" /><div className={a.openingCardCopy}><h3>工程师与研发人员</h3><p>核对位置、设备关系与运行数据，协调现场人员，记录操作、备注与附件，并提交处理结果。</p></div></article>
          <article><ResponsibilitiesIllustration role="supervisor" /><div className={a.openingCardCopy}><h3>运维主管</h3><p>指定负责人派单，也可自行领取；查看项目与工单进度、审批处理结果，并核对人员贡献及对应工单。</p></div></article>
        </div>
      </Chapter>
      </div>
      <Chapter id="structure" title="导航与页面组织" intro="将工作台、工单、项目、统计、权限与配置分组组织。工单管理下区分清单、个人任务、审批与贡献统计，保持模块入口和页面层级的对应关系。">
        <div className={a.moduleCards} role="list" aria-label="运维平台功能模块" data-module-cards>{([
          ["grid-layout", "工作台", ["项目异常与健康度", "项目清单与完成率"]],
          ["clipboard-list", "工单管理", ["工单池", "我的工单", "工单审批", "贡献统计"]],
          ["office", "项目管理", ["设备与策略", "运行数据", "固件维护"]],
          ["chart-bar", "统计与台账", ["工单台账", "维保记录"]],
          ["users", "组织与权限", ["组织", "账号与角色"]],
          ["gear", "配置中心", ["告警规则", "工单推送", "评分配置"]],
        ] as const).map(([icon, name, items]) => <article className={a.moduleCard} key={name} role="listitem" data-module-card><h3><NucleoIcon name={icon} size={24} /><span>{name}</span></h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      </Chapter>
      <Chapter id="priority" layout="wide" title="项目看板与清单设计" intro="在概览与项目清单中分别呈现健康度、等级、异常和处理进度。通过筛选、排序与明细展开，让汇总信息和具体问题逐层衔接。">
        <PrototypePreview id="priority" name="项目总览" caption="项目等级、健康度与异常明细，放在同一个判断路径中。"><div className={`${s.heroPrototype} ${a.dashboardPrototype}`} id="hero-prototype" role="region" aria-label="运维平台交互原型"><Dashboard /></div></PrototypePreview>
        <div className={a.priorityNotes}><PriorityCriteria /></div>
      </Chapter>
      <WorkOrderEvidence onComplete={(record) => setContributions((previous) => [...previous.filter((item) => item.id !== record.id), record])}>{({ pool, detail, history }) => <WorkJourney>
        <Chapter id="work-orders" title="工单列表与筛选" intro="用状态切换、筛选和表格组织工单，清单直接展示负责人和连续异常天数。当天同项目、同房间的同类异常合并展示，保留进入详情的入口。">
          <PrototypePreview id="work-orders" name="工单池" caption="同类异常合成任务，状态和持续时间直接进入清单。">{pool}</PrototypePreview>
        </Chapter>
        <Chapter id="ownership" title="详情层级与处理表单" intro="详情优先呈现位置、负责人和异常依据，再展开设备明细与处理记录。表单区分可编辑、禁用与只读状态，处理操作与当前工单状态对应。">
          <PrototypePreview id="ownership" name="工单详情" caption="在设备证据和处理记录之间，保留明确的责任与执行关系。">{detail}</PrototypePreview>
        </Chapter>
          <Chapter id="history" title="历史记录的分层展示" intro="分别组织房间历史工单与设备异常记录。保留对象与时间信息，切换设备时核对异常发生、恢复和再次发生的记录。">
          <PrototypePreview id="history" name="异常记录" caption="按房间回看工单，按设备区分连续异常与再次发生。">{history}</PrototypePreview>
          <HistoryCriteria />
        </Chapter>
      </WorkJourney>}</WorkOrderEvidence>
      <Chapter id="workflow" layout="wide" title="状态与操作反馈" intro="将领取、派单、处理与审批对应到工单状态和操作入口；区分负责人和现场处理人，让用户确认当前进度与下一步操作。">
        <div className={a.workflowStage}><WorkflowDiagram /></div>
      </Chapter>
      <Chapter id="contribution" layout="wide" title="统计信息与明细核对" intro="通过团队与个人视图呈现已完成工单的贡献数据，区分执行得分与跟进记录；每笔统计保留对应工单，支持从概览核对明细。">
        <PrototypePreview id="contribution" name="贡献统计" caption="执行得分与跟进记录分别保存，每笔贡献都有对应的工单。"><ContributionDemo records={contributions} /></PrototypePreview>
      </Chapter>
      <ClosingSequence>
      <Chapter id="system" layout="wide" title="界面规范" intro="从字体、字号到色彩，让清单、详情和统计使用同一套视觉语言。">
        <InterfaceStandards />
      </Chapter>
      <Chapter id="reflection" layout="closing" title="界面与交互复盘" intro="围绕列表、字段、表单和状态反馈，回看界面中的关键设计取舍。">
        <DesignReflection />
      <footer className={a.nextCase}><Link href="/">返回作品集<IconArrowUpRight size={20} /></Link><Link href="/work/heyispace-os"><span>下一个案例</span><strong>HEYISPACE OS</strong><IconArrowRight size={28} /></Link></footer>
      </Chapter>
      </ClosingSequence>
    </div>
  </div></PrototypeExperience>;
}
