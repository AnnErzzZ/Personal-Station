/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react';
import manifest from '../../../public/cases/heyispace-os/approved-20261117/manifest.json';
import shared from './current.module.css';
import s from './editorial.module.css';

export const chapterTitles = ['合一空间', '项目背景', '用户需求', '设计目标', '功能结构', 'Agent 对话', '回答结构', '地图编辑器', '配置流程', '空间多视图', '运行统计', '账号权限', '图表设计', '个人贡献'];
const base = '/cases/heyispace-os/approved-20261117/';
type Bounds = { x: number; y: number; width: number; height: number };
type Asset = { name: string; nodeId: string; src: string; width: number; height: number; box?: Bounds; render?: Bounds };
const assets = manifest as Asset[];

// Keep the native screen and its shadow at their own render bounds.
function Picture({ name, label, children }: { name: string; label: string; children?: ReactNode }) {
  const asset = assets.find(item => item.name === name)!;
  const box = asset.box!;
  const render = asset.render!;
  const imageStyle = {
    left: `${(render.x - box.x) / box.width * 100}%`,
    top: `${(render.y - box.y) / box.height * 100}%`,
    width: `${render.width / box.width * 100}%`,
  } as CSSProperties;
  return <figure className={s.figure} data-asset={name} data-figma-node={asset.nodeId} style={{ aspectRatio: `${box.width} / ${box.height}` }}>
    <button className={shared.inspect} data-preview={asset.src} data-preview-label={label} aria-label={`放大查看：${label}`}>
      <img src={asset.src} alt={label} width={asset.width} height={asset.height} loading="lazy" style={imageStyle} />
      <span className={shared.inspectHint} aria-hidden="true">放大查看 ↗</span>
    </button>{children}
  </figure>;
}

function Chapter({ number, en, children, className = '', description }: { number: number; en: string; children: ReactNode; className?: string; description?: ReactNode }) {
  const id = String(number).padStart(2, '0');
  return <section id={`chapter-${id}`} data-chapter={id} className={`${s.section} ${className}`} aria-labelledby={`title-${id}`}>
    <img className={s.chapterBackground} src={`${base}bg-${id}.webp`} alt="" aria-hidden="true" width="1600" height={assets.find(a => a.name === `bg-${id}`)!.height} loading="lazy" />
    <div className={s.inner}><header className={s.sectionHead}><div><h2 id={`title-${id}`}>{chapterTitles[number - 1]}<img src={`${base}theme-mark.svg`} width="20" height="20" alt="" aria-hidden="true" /></h2><p className={s.english}>{en}</p></div>{description && <p className={s.headDescription}>{description}</p>}</header>{children}</div>
  </section>;
}
function Point({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <div className={`${s.point} ${className}`}><h3>{title}</h3><p>{children}</p></div>;
}
const roles = [
  ['交付与配置', '把现场配置成空间地图，\n标清房间与设备位置。', '配置项多、顺序不清，\n初次使用不易上手。'],
  ['日常运维', '找到设备，查看运行状态，\n回看历史变化。', '位置、状态与占用需一起判断，\n单一视图难以看全。'],
  ['运营与管理', '按时间和房间比较占用、\n设备与环境数据。', '汇总数字难解释差异，\n还需查看趋势和明细。'],
];
const goals = [
  ['让数据可查询、可验证', '结合图表、明细与统计口径核对分析结果。'], ['按角色分配账号权限', '区分查看、编辑与控制等操作权限。'],
  ['降低地图配置门槛', '按底图、空间、设备、检测区的顺序完成配置。'], ['快速查看空间与设备状态', '按任务切换设备、工位、点云和回放视图。'],
  ['按时间与房间分析运行情况', '比较占用、设备运行和环境数据。'],
];
const capabilities = [
  ['空间与地图', '空间层级', '地图配置', '多视图', '房间与工位'], ['设备管理', '位置与状态', '设备控制', '设备属性', '日志与异常'],
  ['策略控制', '房间策略', '策略配置', '自动控制', '执行状态'], ['运行统计', '空间使用', '自动控制统计', '设备运行', '环境趋势'],
  ['Agent 对话', '业务提问', '指标与图表', '明细与口径', '连续追问'], ['系统与权限', '用户管理', '角色管理', '组织管理', '权限配置'],
];
const answerParts = [
  ['结论', '先给出问题的直接回答。', 149.7008], ['关键指标', '集中展示需要比较的数字。', 259.5323], ['图表', '用趋势和对比解释变化。', 495.9718],
  ['分析发现', '指出数据里的关键变化。', 724.396], ['明细表格', '提供具体记录的查看入口。', 827.3628], ['口径说明', '核对统计范围与计算方式。', 914.2183],
] as const;
const steps = [
  ['准备空间底图', '上传平面图，输入真实尺寸。'], ['建立空间结构', '划分房间，编辑空间边界。'], ['配置设备位置', '定位设备锚点，设置高度与方向。'],
  ['编辑检测范围', '配置有效范围、检测区与工位区。'], ['发布空间地图修改', '检查配置，保存草稿后发布修改。'],
];
const views = [
  ['cloud', 'POINT CLOUD', '实时点云', '查看实时感知信息。'], ['device', 'DEVICE VIEW', '设备视图', '核对设备位置与状态。'],
  ['desk', 'DESK VIEW', '工位视图', '查看工位与使用信息。'], ['playback', 'PLAYBACK', '回放视图', '回看指定时段的状态。'],
];

export default function EditorialSections() {
  return <div className={s.editorial} data-design-revision="R04-R05-R08-20261117">
    <section id="chapter-01" data-chapter="01" className={s.hero} aria-labelledby="title-01">
      <div className={s.heroBody}><img className={s.heroScene} src={`${base}hero.webp`} alt="笔记本中的合一空间 Agent 真实界面" width="1600" height="1100" fetchPriority="high" />
        <header className={s.heroInfo}><h1 id="title-01">合一空间</h1><p className={s.heroEnglish}>HEYISPACE OS</p><div className={s.heroDescription}><p className={s.heroTagline}>空间、设备与数据</p><p>面向智能空间管理的 Web 系统。<br />通过地图配置、多视图与 Agent，<br />支持配置、运维和分析。</p></div></header>
        <p className={s.heroRole}>交互设计师<br />地图编辑器与 Agent 体验</p>
      </div>
    </section>
    <Chapter number={2} en="PROJECT BACKGROUND">
      <div className={s.contextIntro}><h3>空间交付后的持续管理</h3><p>空间交付后，还需要日常运维和运营分析。这些工作都离不开空间、设备和运行数据。<br />系统把这些信息放在同一个平台。</p></div>
      <div className={s.contextTasks}>{[['空间配置', '配置空间，标记设备位置。'], ['日常运维', '查看设备状态，定位异常。'], ['运营分析', '查看运行数据，分析使用情况。']].map(([title, text], i) => <article key={title}><span>0{i + 1}</span><Point title={title}>{text}</Point></article>)}</div>
    </Chapter>
    <Chapter number={3} en="USER NEEDS"><div className={s.roleGrid}>{roles.map(([title, task, pain]) => <article className={s.role} key={title}><h3>{title}</h3><div><h4>需要完成的任务</h4><p>{task}</p></div><div><h4>使用难点</h4><p>{pain}</p></div></article>)}</div><p className={s.note}>依据已确认的角色任务和现有功能归纳。</p></Chapter>
    <Chapter number={4} en="DESIGN OBJECTIVES"><ol className={s.goals}>{goals.map(([title, text], i) => <li key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></Chapter>
    <Chapter number={5} en="FUNCTIONAL STRUCTURE"><div className={s.architecture}><div className={s.systemRoot}><h3>Heyispace OS</h3><p>以空间为工作上下文，连接配置、查看和分析。</p></div><img className={s.connections} src={`${base}functional-connections.svg`} width="1196" height="76" alt="" aria-hidden="true" /><div className={s.moduleGrid}>{capabilities.map(([title, ...items]) => <article key={title}><h3>{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</div></div><p className={s.note}>按现有能力分组，并非逐级菜单；业务层级与底层能力属团队范围。</p></Chapter>
    <Chapter number={6} en="AGENT CONVERSATION" className={s.agent} description={<>用自然语言查询现有业务数据。<br />从完整分析，到带着上下文继续追问。</>}>
      <div className={s.agentStage}><Picture name="agent-pad" label="R05 完整 Agent 会话与追问 Pad" /></div>
      <div className={s.agentDetails}><article><Point title="查看完整分析">结论、数字与依据在同一份回答中。</Point><Picture name="agent-analysis" label="查看完整分析：结论、指标与依据" /></article><article><Point title="继续追问">输入框展示按房间对比的追问示例。</Point><Picture name="agent-followup" label="继续追问：按房间对比示例" /></article></div>
    </Chapter>
    <Chapter number={7} en="ANSWER STRUCTURE"><div className={s.anatomy}><div className={s.answerNotes}>{answerParts.map(([title, text, y], i) => <button className={s.answerNote} key={title} data-answer={i} aria-label={`高亮回答：${title}`} aria-pressed={i === 0} style={{ '--note-y': `${y / 983.043457 * 100}%` } as CSSProperties}><strong>{title}</strong><span>{text}</span></button>)}</div><div className={s.answerCanvas}><Picture name="answer" label="回答中的结论、指标、图表、分析发现、明细与口径"><span className={s.answerFocus} aria-hidden="true" /></Picture><div className={s.answerLeaders} aria-hidden="true">{[[122.7251, 53.9515], [207.2793, 104.5059], [323.0864, 345.7708], [680.1582, 88.4756], [799.2363, 56.253], [886.0918, 56.253]].map(([top, height], i) => <span key={i} style={{ top: `${top / 983.043457 * 100}%`, height: `${height / 983.043457 * 100}%` }} />)}</div></div></div><p className={s.note}>明细与统计口径保留在回答中，便于继续核对。</p></Chapter>
    <Chapter number={8} en="MAP EDITOR">
      <div className={s.sidebarLayout}><div className={`${s.sideNotes} ${s.editorNotes}`}><Point title="对象选择">按网络与分组排列设备，<br />用选中态标明当前雷达。</Point><Point title="位置核对">查看雷达位置与检测范围，<br />对照房间边界核对覆盖关系。</Point><Point title="参数调整">集中编辑坐标和安装方向，<br />三处界面始终对应同一对象。</Point></div><Picture name="editor" label="地图编辑器：工具栏、对象列表、画布和属性栏" /></div>
      <details className={s.designDecision}><summary>设计判断：将雷达区域配置与地图融合放在一起</summary><div><Point title="让覆盖连续，让方向与真实安装一致">原先先用雷达工具画区域，再到地图工具完成融合。合并到同一编辑器后，可以对照地图核对区域、设备位置与方向。</Point><Point title="收益与代价 · 复盘归纳">画布用于直观核对，坐标和方向数值用于精调；也要求列表、画布和属性栏始终反馈同一选中对象。地图编辑器已进入真实产品，支持工程师完成常规配置。</Point></div></details>
    </Chapter>
    <Chapter number={9} en="CONFIGURATION FLOW"><ol className={s.steps}>{steps.map(([title, text], i) => <li key={title}><span>0{i + 1}</span><Point title={title}>{text}</Point></li>)}</ol><div className={s.configuration}><p>完整工作区 · 检测区编辑状态</p><Picture name="configuration-pad" label="R08 完整地图编辑器 Pad：工具栏、对象列表、画布、属性与检测区弹窗" /></div></Chapter>
    <Chapter number={10} en="SPATIAL VIEWS"><div className={s.views}>{views.map(([name, en, title, text], i) => <article className={s.view} key={name}><div className={s.viewMain}><Picture name={`view-${name}`} label={`${title}：完整横向 Pad 界面`} /></div><div className={s.viewAside}><p className={s.viewEnglish}>0{i + 1} / {en}</p><Point title={title}>{text}</Point><div className={s.viewDetail}><Picture name={`view-${name}-detail`} label={`${title}：对应状态局部`} /></div></div></article>)}</div><p className={s.note}>点云、设备与工位用于查看当前信息，回放用于查看历史变化。</p></Chapter>
    <Chapter number={11} en="OPERATIONAL ANALYTICS"><div className={s.statistics}><div className={s.sidebarLayout}><Point title="先确认统计范围">按时间和房间筛选，<br />再看逗留时长、占用等概览。</Point><Picture name="statistics-overview" label="时间、房间筛选与统计概览" /></div><div className={s.statisticsReverse}><Picture name="statistics-pad" label="运行与环境：趋势和设备运行统计 Pad" /><Point title="再观察变化">结合设备运行与环境趋势，<br />比较不同时间的数据。</Point></div></div><p className={s.note}>数据来自产品原稿示例。</p></Chapter>
    <Chapter number={12} en="ACCOUNT PERMISSIONS"><div className={`${s.sidebarLayout} ${s.permissions}`}><div className={s.sideNotes}><Point title="从角色到具体操作">先选择角色和功能，<br />再逐项配置操作权限。</Point><Point title="保留操作差异">能查看设备状态，<br />并不代表能操作设备。</Point></div><Picture name="permissions-pad" label="角色、功能、授权与保存：真实账号权限配置 Pad" /></div></Chapter>
    <Chapter number={13} en="DATA VISUALIZATION"><div className={s.sidebarLayout}><div className={s.sideNotes}><Point title="十四种图表">图表承载不同类型的数据，<br />沿用统一的色彩与信息层级。</Point><Point title="保留核对信息">保留图例、坐标与数据标注。<br />按数据关系选择合适的表达。</Point></div><div className={s.chartBoard}>{[1, 2, 3].map(n => <Picture key={n} name={`charts-${n}`} label={`图表设计第 ${n} 列：${n === 3 ? '4' : '5'} 种真实图表示例`} />)}</div></div><p className={s.note}>覆盖趋势、对比、构成、分布等数据表达。</p></Chapter>
    <Chapter number={14} en="MY CONTRIBUTION"><div className={s.contribution}><div className={s.contributionNotes}><Point title="我主导的设计">地图编辑器的功能结构、配置流程与 UX / UI。<br />Agent 的查询追问体验与六段回答结构。</Point><Point title="与团队共同推进">空间多视图、账号权限的体验深化。<br />运行分析的 UX / UI 与研发跟进。</Point><Point title="已确认的落地">地图编辑器进入真实产品，<br />支持工程师完成常规配置；Agent 已上线。</Point></div><div className={s.contributionPictures}><Picture name="contribution-editor" label="地图编辑器交付缩览" /><Picture name="contribution-agent" label="Agent 六段回答交付缩览" /></div></div><p className={s.note}>正式职位：交互设计师。RAG 知识库为协作参与。<br />底层模型、硬件、算法与节能估算归团队范围。</p></Chapter>
  </div>;
}
