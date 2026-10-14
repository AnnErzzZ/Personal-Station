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
      <Chapter id="background" layout="opening" title="多项目运维的协作难题" intro="异常分布在不同项目和房间，处理过程涉及远程排查、现场检修与多人协作。团队需要明确处理顺序，持续跟进问题，并记录各自承担的工作。">
        <ol className={a.problemRows}>
          {([
            ["priority", "先处理什么", "项目重要程度、异常影响和持续时间不同，需要共同判断处理顺序。"],
            ["history", "问题是否反复", "当天的异常列表无法完整说明问题，还需要查看持续天数与历史发生次数。"],
            ["ownership", "谁跟进，谁执行", "工单负责人和现场处理人可能不同，需要分别记录责任与实际工作。"],
          ] as const).map(([kind, title, text]) => <li key={kind}><CollaborationIllustration kind={kind} /><div className={a.openingCardCopy}><h3>{title}</h3><p>{text}</p></div></li>)}
        </ol>
      </Chapter>
      <Chapter id="users" layout="opening" title="用户与职责" intro="工程师负责排查和处理，主管安排任务并复核结果。两种角色都可以自行领取工单。">
        <div className={a.roleCards} data-role-cards>
          <article><ResponsibilitiesIllustration role="engineer" /><div className={a.openingCardCopy}><h3>工程师与研发人员</h3><p>核对位置、设备关系与运行数据，协调现场人员，记录操作、备注与附件，并提交处理结果。</p></div></article>
          <article><ResponsibilitiesIllustration role="supervisor" /><div className={a.openingCardCopy}><h3>运维主管</h3><p>指定负责人派单，也可自行领取；查看项目与工单进度、审批处理结果，并核对人员贡献及对应工单。</p></div></article>
        </div>
      </Chapter>
      </div>
      <Chapter id="structure" title="平台结构" intro="工作台汇总项目运行情况。工单管理下设工单池、我的工单、工单审批与贡献统计；项目、台账、权限和配置分别管理。">
        <div className={a.moduleCards} role="list" aria-label="运维平台功能模块" data-module-cards>{([
          ["grid-layout", "工作台", ["项目异常与健康度", "项目清单与完成率"]],
          ["clipboard-list", "工单管理", ["工单池", "我的工单", "工单审批", "贡献统计"]],
          ["office", "项目管理", ["设备与策略", "运行数据", "固件维护"]],
          ["chart-bar", "统计与台账", ["工单台账", "维保记录"]],
          ["users", "组织与权限", ["组织", "账号与角色"]],
          ["gear", "配置中心", ["告警规则", "工单推送", "评分配置"]],
        ] as const).map(([icon, name, items]) => <article className={a.moduleCard} key={name} role="listitem" data-module-card><h3><NucleoIcon name={icon} size={24} /><span>{name}</span></h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      </Chapter>
      <Chapter id="priority" layout="wide" title="项目优先级" intro="项目等级和健康度共同辅助安排任务：优先关注战略项目，同时核对异常情况，具体先后结合实际影响判断。">
        <PrototypePreview id="priority" name="项目总览" caption="项目等级、健康度与异常明细，放在同一个判断路径中。"><div className={`${s.heroPrototype} ${a.dashboardPrototype}`} id="hero-prototype" role="region" aria-label="运维平台交互原型"><Dashboard /></div></PrototypePreview>
        <div className={a.priorityNotes}><PriorityCriteria /></div>
      </Chapter>
      <WorkOrderEvidence onComplete={(record) => setContributions((previous) => [...previous.filter((item) => item.id !== record.id), record])}>{({ pool, detail, history }) => <WorkJourney>
        <Chapter id="work-orders" title="工单池" intro="从工单清单安排处理，直接查看状态、负责人和最长连续异常天数。同一项目、同一房间内的同类异常合并为一张自动工单。">
          <PrototypePreview id="work-orders" name="工单池" caption="同类异常合成任务，状态和持续时间直接进入清单。">{pool}</PrototypePreview>
        </Chapter>
        <Chapter id="ownership" title="工单详情" intro="从工单池打开工单，核对异常依据与设备位置；在设备明细中查看连续异常和异常次数。">
          <PrototypePreview id="ownership" name="工单详情" caption="在设备证据和处理记录之间，保留明确的责任与执行关系。">{detail}</PrototypePreview>
        </Chapter>
          <Chapter id="history" title="异常记录" intro="查看房间历史工单，或切换设备查看异常的发生与恢复记录。">
          <PrototypePreview id="history" name="异常记录" caption="按房间回看工单，按设备区分连续异常与再次发生。">{history}</PrototypePreview>
          <HistoryCriteria />
        </Chapter>
      </WorkJourney>}</WorkOrderEvidence>
      <Chapter id="workflow" layout="wide" title="工单流转" intro="自领后由当前账号负责，主管派单时指定负责人。需到场操作的问题，另行安排现场处理人。">
        <div className={a.workflowStage}><WorkflowDiagram /></div>
      </Chapter>
      <Chapter id="contribution" layout="wide" title="贡献统计" intro="只统计已完成工单。实际执行人获得贡献得分，负责人保留跟进记录；每笔得分可追溯到工单。">
        <PrototypePreview id="contribution" name="贡献统计" caption="执行得分与跟进记录分别保存，每笔贡献都有对应的工单。"><ContributionDemo records={contributions} /></PrototypePreview>
      </Chapter>
      <ClosingSequence>
      <Chapter id="system" layout="wide" title="界面规范" intro="从字体、字号到色彩，让清单、详情和统计使用同一套视觉语言。">
        <InterfaceStandards />
      </Chapter>
      <Chapter id="reflection" layout="closing" title="设计复盘" intro="设计中的关键取舍。">
        <DesignReflection />
      <footer className={a.nextCase}><Link href="/">返回作品集<IconArrowUpRight size={20} /></Link><Link href="/work/heyispace-os"><span>下一个案例</span><strong>HEYISPACE OS</strong><IconArrowRight size={28} /></Link></footer>
      </Chapter>
      </ClosingSequence>
    </div>
  </div></PrototypeExperience>;
}
