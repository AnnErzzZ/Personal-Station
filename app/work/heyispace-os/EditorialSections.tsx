/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react';
import shared from './current.module.css';
import s from './editorial.module.css';

const assets = {
  agent: [2814, 2200, 'Agent 会话与追问'],
  answer: [873, 901, '包含结论、指标与依据的完整回答'],
  editor: [1408, 962, '地图编辑器的工具栏、对象列表、画布和属性栏'],
  'editor-detail1': [896, 480, '对象列表中的选中设备'],
  'editor-detail2': [896, 480, '画布中的设备位置与检测范围'],
  'editor-detail3': [896, 480, '设备属性中的位置与朝向'],
  step1: [500, 404, '上传底图与填写真实尺寸'],
  step2: [772, 404, '空间边界编辑'],
  step3: [636, 404, '设备位置与属性配置'],
  step4: [636, 404, '检测范围与工位配置'],
  step5: [664, 144, '保存草稿与发布入口'],
  'front-view1': [763, 926, '空间地图：实时点云'],
  'front-view2': [763, 926, '空间地图：设备视图'],
  'front-view3': [763, 926, '空间地图：工位视图'],
  'front-view4': [763, 926, '空间地图：回放视图'],
  statistics1: [1026, 416, '时间房间筛选与统计概览'],
  statistics2: [1026, 670, '设备运行与环境趋势'],
  'statistics-full': [2880, 2672, '完整运行统计界面'],
  permissions: [1163, 838, '角色、功能与操作权限配置'],
  'chart-column1': [624, 2519, '图表组件第1组'],
  'chart-column2': [624, 2415, '图表组件第2组'],
  'chart-column3': [624, 2029, '图表组件第3组'],
} as const;
type Asset = keyof typeof assets;

function Picture({ name, frame = false }: { name: Asset; frame?: boolean }) {
  const [width, height, label] = assets[name];
  const src = name === 'statistics-full'
    ? '/cases/heyispace-os/06-operations-dashboard/operations-statistics-detail.png'
    : `/cases/heyispace-os/current/${name}.png`;
  const portrait = frame && name.startsWith('front-view');
  const content = portrait
    ? <svg viewBox="24 24 680 842" role="img" aria-label={label}><image href={src} width={width} height={height} /></svg>
    : <img src={src} alt={label} width={width} height={height} loading="lazy" />;
  return <figure className={`${s.figure} ${frame ? s.tablet : ''}`} data-asset={name}
    data-device={frame ? 'ipad' : undefined} data-orientation={frame ? (portrait ? 'portrait' : 'landscape') : undefined}>
    <button className={shared.inspect} data-preview={src} data-preview-label={label} aria-label={`放大查看：${label}`}>
      {frame ? <>
        <span className={s.tabletDisplay}>{content}</span>
        <img className={s.tabletHardware} src="/cases/heyispace-os/current/ipad-shell-v1.png"
          alt="" aria-hidden="true" width="1448" height="1086" loading="lazy" />
      </> : content}
      <span className={`${shared.inspectHint} ${frame ? s.tabletHint : ''}`} aria-hidden="true">放大查看 ↗</span>
    </button>
  </figure>;
}

function Chapter({ number, title, children, tone = false, className = '' }: {
  number: number; title: string; children: ReactNode; tone?: boolean; className?: string;
}) {
  const id = String(number).padStart(2, '0');
  return <section id={`chapter-${id}`} data-chapter={id} aria-label={`${number} ${title}`}
    className={`${s.section} ${tone ? s.tone : ''} ${className}`}>
    <div className={s.inner}>{children}</div>
  </section>;
}

function Heading({ en, title, description }: { en: string; title: string; description?: string }) {
  return <header className={s.sectionHead}>
    <div><p className={s.english}>{en}</p><h2>{title}</h2></div>
    {description && <p className={s.intro}>{description}</p>}
  </header>;
}

function Point({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <div className={s.point}><span>{number}</span><div><h3>{title}</h3><p>{children}</p></div></div>;
}

const roles = [
  ['交付与配置', '把现场配置成空间地图，标清房间与设备位置。', '配置项多、顺序不清，初次使用不易上手。'],
  ['日常运维', '找到设备，查看运行状态，回看历史变化。', '位置、状态与占用需一起判断，单一视图难以看全。'],
  ['运营与管理', '按时间和房间比较占用、设备与环境数据。', '汇总数字难解释差异，还需查看趋势和明细。'],
];
const goals = [
  ['让数据可查询、可验证', '结合图表、明细与统计口径核对分析结果。'],
  ['按角色分配账号权限', '区分查看、编辑与控制等操作权限。'],
  ['降低地图配置门槛', '按底图、空间、设备、检测区的顺序完成配置。'],
  ['快速查看空间与设备状态', '按任务切换设备、工位、点云和回放视图。'],
  ['按时间与房间分析运行情况', '比较占用、设备运行和环境数据。'],
];
const capabilities = [
  ['空间与地图', '空间层级', '地图配置', '多视图', '房间与工位'],
  ['设备管理', '位置与状态', '设备控制', '设备属性', '日志与异常'],
  ['策略控制', '房间策略', '策略配置', '自动控制', '执行状态'],
  ['运行统计', '空间使用', '自动控制统计', '设备运行', '环境趋势'],
  ['Agent 对话', '业务提问', '指标与图表', '明细与口径', '连续追问'],
  ['系统与权限', '用户管理', '角色管理', '组织管理', '权限配置'],
];
const answerParts = [
  ['结论', '先给出问题的直接回答。'],
  ['关键指标', '集中展示需要比较的数字。'],
  ['图表', '用趋势和对比解释变化。'],
  ['分析发现', '指出数据里的关键变化。'],
  ['明细表格', '提供具体记录的查看入口。'],
  ['口径说明', '核对统计范围与计算方式。'],
];
const targets = [13.3645, 25.135, 50.524, 75.008, 86.021, 95.347];
const steps: { title: string; description: string; asset: Asset }[] = [
  { title: '准备空间底图', description: '上传平面图，输入真实尺寸，建立比例依据。', asset: 'step1' },
  { title: '建立空间结构', description: '依据底图划分房间，确定后续配置的空间边界。', asset: 'step2' },
  { title: '配置设备位置', description: '先确定锚点、高度与方向，再配置检测范围。', asset: 'step3' },
  { title: '编辑检测范围', description: '结合设备位置，划定有效范围、检测区与工位区。', asset: 'step4' },
  { title: '发布空间地图修改', description: '完成检查后保存草稿，再发布本次修改。', asset: 'step5' },
];

export default function EditorialSections() {
  return <div className={s.editorial}>
    <Chapter number={2} title="项目背景" className={s.context}>
      <div className={s.contextLead}>
        <header><p className={s.displayEnglish}>PROJECT<br />CONTEXT</p><h2>项目背景</h2></header>
        <div className={s.contextCopy}>
          <p className={s.contextStatement}>空间交付后，<br />日常运维与运营分析仍在继续。</p>
          <p>这些工作都离不开空间、设备和运行数据。<br />合一空间把它们放在同一个平台，支持配置、查看与分析。</p>
        </div>
      </div>
      <div className={s.contextTasks}>
        {[['空间配置', '配置空间，标记设备位置。'], ['日常运维', '查看设备状态，定位异常。'], ['运营分析', '查看运行数据，分析使用情况。']].map(([title, body], i) =>
          <Point key={title} number={`0${i + 1}`} title={title}>{body}</Point>)}
      </div>
    </Chapter>

    <Chapter number={3} title="用户需求与痛点" tone>
      <Heading en="USER NEEDS" title="用户需求与痛点" />
      <div className={s.roleGrid}>{roles.map(([title, task, pain], i) => <article className={s.roleCard} key={title}>
        <span className={s.serial}>0{i + 1}</span><h3>{title}</h3>
        <div><h4>需要完成的任务</h4><p>{task}</p></div><div><h4>使用难点</h4><p>{pain}</p></div>
      </article>)}</div>
      <p className={s.note}>依据已确认的角色任务和现有功能归纳。</p>
    </Chapter>

    <Chapter number={4} title="设计目标">
      <Heading en="DESIGN OBJECTIVES" title="设计目标" />
      <div className={s.goalsLayout}>
        <div className={s.goalsLead}><span>05</span><p>把需求落到<br />可检查的操作与信息变化。</p><small>每个目标，都对应现有功能。</small></div>
        <div className={s.goalList}>{goals.map(([title, body], i) => <Point number={`0${i + 1}`} title={title} key={title}>{body}</Point>)}</div>
      </div>
    </Chapter>

    <Chapter number={5} title="功能结构" tone>
      <Heading en="SYSTEM STRUCTURE" title="功能结构" description="围绕空间，组织配置、运维与分析所需的功能。" />
      <div className={s.architecture}>
        <div className={s.systemRoot}><span>Heyispace OS</span><p>以空间为工作上下文<br />连接配置、查看和分析</p><div className={s.systemLink} aria-hidden="true" /></div>
        <div className={s.moduleGrid}>{capabilities.map(([title, ...items], i) => <article className={s.module} key={title}>
          <header className={s.moduleHead}><span>0{i + 1}</span><h3>{title}</h3></header>
          <ul className={s.moduleItems}>{items.map(item => <li key={item}>{item}</li>)}</ul>
        </article>)}</div>
        <div className={s.structureCount}><span>06 组能力</span><span>24 项功能</span></div>
      </div><p className={s.note}>按现有能力分组，并非逐级菜单；业务层级与底层能力属团队范围。</p>
    </Chapter>

    <Chapter number={6} title="Agent 对话">
      <Heading en="AGENT WORKSPACE" title="Agent 对话" description="从一个业务问题开始，在同一段对话中查看分析，并围绕结果继续追问。" />
      <div className={s.stage}><Picture name="agent" frame /></div>
      <div className={s.captionRow}>
        <Point number="01" title="提出业务问题">用自然语言查询现有业务数据。</Point>
        <Point number="02" title="查看完整分析">结论、数字与依据在同一份回答中。</Point>
        <Point number="03" title="继续追问">输入框展示按房间对比的追问示例。</Point>
      </div>
    </Chapter>

    <Chapter number={7} title="回答结构" tone>
      <Heading en="ANSWER ANATOMY" title="回答结构" description="先给结论和关键数字，再用图表、明细与口径提供依据。" />
      <div className={s.anatomy}>
        <div className={s.answerNotes}>{answerParts.map(([title, body], i) => <button key={title} data-answer={i}
          className={s.answerNote} aria-label={`高亮回答：${title}`} aria-pressed={i === 0}><strong>{title}</strong><span>{body}</span></button>)}</div>
        <div className={s.answerLines} aria-hidden="true">{targets.map((end, i) => {
          const start = `calc(${(i + .5) * 100 / 6}% + ${i * 8 / 3 - 20 / 3}px)`;
          return <svg key={i} viewBox="0 0 64 100" preserveAspectRatio="none" style={{ top: start, height: `max(1px, calc(${end}% - ${start}))` } as CSSProperties}>
            <path d="M0 0 H32 V100 H64" fill="none" stroke="#138c78" strokeWidth="1.25" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          </svg>;
        })}</div>
        <div className={s.answerCanvas}><Picture name="answer" /><span className={shared.answerFocus} aria-hidden="true" /></div>
      </div><p className={s.note}>明细与统计口径保留在回答中，便于继续核对。</p>
    </Chapter>

    <Chapter number={8} title="地图编辑器" className={s.editorDecision}>
      <Heading en="MAP EDITOR" title="让对象选择、位置核对与参数编辑保持一致" description="原先要先用雷达工具画区域，再到地图工具完成融合。难点是让覆盖连续，并让方向与真实安装一致。" />
      <p className={s.editorTask}>将雷达区域配置与地图融合放在同一编辑器中。以配置一台设备的位置、方向和范围为例：</p>
      <div className={s.editorStage}><Picture name="editor" frame /></div>
      <div className={s.objectContinuity}><span>同一对象 · 业务区雷达2</span><p>列表选中 → 画布高亮 → 属性标题</p></div>
      <div className={s.detailGrid}>{([
        ['editor-detail1', '先确认正在改哪台设备', '列表保留网络与分组归属，用选中态区分名称相近的雷达。'],
        ['editor-detail2', '再核对位置与覆盖关系', '同一台雷达在画布中高亮，对照房间边界检查锚点与范围。'],
        ['editor-detail3', '用数值完成精确调整', '属性栏保留设备名称，集中编辑 X、Y 坐标与安装方向。'],
      ] as const).map(([asset, title, body], i) => <article key={asset}><Picture name={asset} /><Point number={`0${i + 1}`} title={title}>{body}</Point></article>)}</div>
      <div className={s.editorTradeoff}><span>收益与代价 · 复盘归纳</span><p>合并工具后，可以在同一界面核对区域与地图。画布用于直观核对，数值输入用于精调；也要求三处始终反馈同一选中对象。</p></div>
      <p className={s.note}>地图编辑器已进入真实产品，支持工程师完成常规配置。</p>
    </Chapter>

    <Chapter number={9} title="地图配置流程" tone>
      <Heading en="CONFIGURATION FLOW" title="地图配置流程" description="从一张底图开始，按五个步骤完成空间地图配置。" />
      <div className={s.stepGrid}>{steps.map(({ title, description, asset }, i) => <article key={asset} className={s.stepCard}>
        <Point number={`0${i + 1}`} title={title}>{description}</Point><div className={s.stepVisual}><Picture name={asset} /></div>
      </article>)}</div><p className={s.note}>按实际配置顺序呈现；各步为独立界面示例，不作为连续操作录屏。</p>
    </Chapter>

    <Chapter number={10} title="空间多视图">
      <Heading en="SPATIAL VIEWS" title="空间多视图" description="同一空间，按任务选择不同的查看方式。" />
      <div className={s.viewGrid}>{([
        ['front-view1', '实时点云', '查看实时感知信息。'], ['front-view2', '设备视图', '核对设备位置与状态。'],
        ['front-view3', '工位视图', '查看工位与使用信息。'], ['front-view4', '回放视图', '回看指定时段的状态。'],
      ] as const).map(([asset, title, body], i) => <article key={asset}><Point number={`0${i + 1}`} title={title}>{body}</Point><Picture name={asset} frame /></article>)}</div>
      <p className={s.note}>点云、设备与工位用于查看当前信息，回放用于查看历史变化。</p>
    </Chapter>

    <Chapter number={11} title="运行统计" tone>
      <Heading en="OPERATIONS DATA" title="运行统计" description="先确定时间与房间范围，再查看概览和趋势。" />
      <div className={s.statisticsRow}><Picture name="statistics-full" frame /><Point number="01" title="先确认统计范围">按时间和房间筛选，再看逗留时长、占用等概览。</Point></div>
      <div className={`${s.statisticsRow} ${s.reverse}`}><Picture name="statistics2" /><Point number="02" title="再观察变化">结合设备运行与环境趋势，比较不同时间的数据。</Point></div>
      <p className={s.note}>数据来自产品原稿示例。</p>
    </Chapter>

    <Chapter number={12} title="角色与权限">
      <Heading en="ROLE & ACCESS" title="角色与权限" description="按角色配置功能与操作权限，查看与控制分别授权。" />
      <div className={s.permissions}><Picture name="permissions" frame /><div>
        <Point number="01" title="从角色到具体操作">先选择角色和功能，再逐项配置操作权限。</Point>
        <Point number="02" title="保留操作差异">能查看设备状态，并不代表能操作设备。</Point>
      </div></div>
    </Chapter>

    <Chapter number={13} title="组件规范" tone>
      <div className={s.chartLayout}>
        <div className={s.chartIntro}><p className={s.english}>CHART LIBRARY</p><h2>组件规范</h2><p>图表承载不同类型的数据，<br />沿用统一的色彩与信息层级。</p>
          <div className={s.chartCount}><strong>14</strong><span>种图表示例</span></div><p>保留图例、坐标与数据标注。<br />按数据关系选择合适的表达。</p></div>
        <div className={s.chartBoard}><Picture name="chart-column1" /><Picture name="chart-column2" /><Picture name="chart-column3" /></div>
      </div><p className={s.note}>覆盖趋势、对比、构成、分布等数据表达。</p>
    </Chapter>

    <Chapter number={14} title="项目总结" className={s.closing}>
      <Heading en="PROJECT REFLECTION" title="项目总结" />
      <div className={s.closingGrid}><p className={s.closingStatement}>让空间可配置，<br />让数据可核对。</p><div>
        <Point number="01" title="我主导的设计">地图编辑器的功能结构、配置流程与 UX / UI。Agent 的查询追问体验与六段回答结构。</Point>
        <Point number="02" title="与团队共同推进">空间多视图、账号权限的体验深化。运行分析的 UX / UI 与研发跟进。</Point>
        <Point number="03" title="已确认的落地">地图编辑器进入真实产品，支持工程师完成常规配置；Agent 已上线。</Point>
      </div></div><p className={s.boundary}>正式职位：交互设计师。RAG 知识库为协作参与。<br />底层模型、硬件、算法与节能估算归团队范围。</p>
    </Chapter>
  </div>;
}
