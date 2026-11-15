/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { CSSProperties } from 'react';
import CaseNav from '../CaseNav';
import source from './current-source.json';
import CaseExperience from './CaseExperience';
import styles from './current.module.css';
import EditorialSections from './EditorialSections';

type Paint = { type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number } };
type DesignNodeData = {
  id: string; name: string; type: string; x: number; y: number; w: number; h: number;
  text?: string; fontSize?: number; fontName?: { family: string; style: string };
  lineHeight?: { unit: string; value: number }; fills?: Paint[]; strokes?: Paint[];
  cornerRadius?: number; strokeWeight?: number; opacity?: number; asset?: string;
  heading?: number; children?: DesignNodeData[]; layoutMode?: string; title?: string;
  clipsContent?: boolean; gradient?: string; paths?: { data: string; windingRule: string }[];
  answer?: number; leader?: number;
};
const chapters = source as unknown as DesignNodeData[];
const u = (n: number) => `calc(${n} * var(--u))`;
const color = (paint?: Paint) => paint?.color
  ? `rgba(${Math.round(paint.color.r * 255)},${Math.round(paint.color.g * 255)},${Math.round(paint.color.b * 255)},${paint.opacity ?? 1})`
  : undefined;
const notes: DesignNodeData[] = [];
function collectNotes(node: DesignNodeData) {
  if (node.answer !== undefined) notes[node.answer] = node;
  node.children?.forEach(collectNotes);
}
collectNotes(chapters[6]);
// Keep the six cards evenly distributed, with a physical 20px inset.
const noteHeight = 'calc(70 * var(--u) + 40px)';
const notePitch = (notes[5].y - notes[0].y) / 5;
const noteGap = `max(12px, calc(${notePitch} * var(--u) - ${noteHeight}))`;
const noteTops = notes.map((_, i) => `calc(${u(notes[0].y)} + ${i} * (${noteHeight} + ${noteGap}))`);
const answerExtra = `max(0px, calc(${noteTops[5]} + ${noteHeight} - ${u(notes[5].y + notes[5].h)}))`;
const answerTargets = [475.278, 581.2087, 809.7, 1030.056, 1129.171, 1213.1071];
const answerLabels = ['结论', '关键指标', '图表', '分析发现', '明细表格', '口径说明'];
const assetLabels: Record<string, string> = {
  agent: 'Agent 会话与追问', answer: '包含结论、指标与依据的完整回答',
  editor: '地图编辑器的工具栏、对象列表、画布和属性栏',
  'editor-detail1': '对象列表中的选中设备', 'editor-detail2': '画布中的设备位置与检测范围',
  'editor-detail3': '设备属性中的位置与朝向',
  step1: '上传底图与填写真实尺寸', step2: '空间边界编辑', step3: '设备位置与属性配置',
  step4: '检测范围与工位配置', step5: '保存草稿与发布入口',
  'front-view1': '空间地图：实时点云', 'front-view2': '空间地图：设备视图',
  'front-view3': '空间地图：工位视图', 'front-view4': '空间地图：回放视图',
  statistics1: '时间房间筛选与统计概览', statistics2: '设备运行与环境趋势',
  permissions: '角色、功能与操作权限配置', 'permission-on': '设备视图开启状态',
  'permission-off': '地图内设备控制关闭状态',
  'chart-column1': '图表组件第1组', 'chart-column2': '图表组件第2组', 'chart-column3': '图表组件第3组',
};

function Figure({ node }: { node: DesignNodeData }) {
  const src = `/cases/heyispace-os/current/${node.asset === 'context' ? 'context-cutout' : node.asset}.png`;
  const label = assetLabels[node.asset ?? ''] ?? node.name.split('｜')[0];
  const image = <img className={styles.picture} src={src} alt={label}
    width={Math.round(node.w)} height={Math.round(node.h)}
    loading={node.asset === 'hero' || node.asset === 'context' ? 'eager' : 'lazy'}
    fetchPriority={node.asset === 'hero' ? 'high' : undefined} />;
  if (node.asset === 'context') return image;
  if (node.asset === 'hero') return <>
    <div className={styles.sceneEdges} aria-hidden="true"
      style={{
        '--scene-left': `max(0px, calc((100cqw - 1600 * var(--u)) / 2 + ${node.x} * var(--u)))`,
        '--scene-right': `max(0px, calc((100cqw - 1600 * var(--u)) / 2 + ${1600 - node.x - node.w} * var(--u)))`,
      } as CSSProperties}>
      {(['left', 'right'] as const).map(side => <span key={side}
        className={side === 'left' ? styles.sceneEdgeLeft : styles.sceneEdgeRight}>
        <svg viewBox={`${side === 'left' ? 0 : node.w - 1} 0 1 ${node.h}`} preserveAspectRatio="none">
          <image href={src} width={node.w} height={node.h} preserveAspectRatio="xMidYMid meet" />
        </svg>
      </span>)}
    </div>
    {image}
  </>;
  return <button className={styles.inspect} data-preview={src} data-preview-label={label}
    aria-label={`放大查看：${label}`}>{image}<span className={styles.inspectHint} aria-hidden="true">放大查看 ↗</span></button>;
}

function DesignNode({ node, chapter }: { node: DesignNodeData; chapter: number }) {
  const fill = node.fills?.find(paint => paint.type === 'SOLID' && paint.visible !== false);
  const stroke = node.strokes?.find(paint => paint.type === 'SOLID' && paint.visible !== false);
  const englishDisplay = node.fontName?.family === 'Manrope' && (node.fontSize ?? 0) >= 72;
  const style = {
    left: u(node.x), top: u(node.y), width: u(node.w), height: node.text ? 'auto' : u(node.h),
    '--font': node.fontSize ?? 22, '--ratio': `${node.w} / ${node.h}`,
    fontSize: node.text ? u(node.heading === 1 ? 66 : node.fontSize ?? 22) : undefined,
    lineHeight: node.heading ? 1.05 : node.lineHeight?.unit === 'PIXELS' ? u(node.lineHeight.value)
      : node.lineHeight?.unit === 'PERCENT' ? node.lineHeight.value / 100 : 1.6,
    color: node.text ? color(fill) : undefined,
    background: node.text || node.asset ? undefined : node.gradient ?? color(fill),
    border: !node.text && !node.asset && !node.paths && stroke ? `${node.strokeWeight ?? 1}px solid ${color(stroke)}` : undefined,
    borderRadius: u(node.cornerRadius ?? 0), opacity: node.opacity ?? 1,
    overflow: node.clipsContent && !node.text && !node.asset ? 'hidden' : undefined,
    fontWeight: /ExtraBold|Black/.test(node.fontName?.style ?? '') ? 800
      : /Bold/.test(node.fontName?.style ?? '') ? 700 : /Medium|Semi/.test(node.fontName?.style ?? '') ? 500 : 400,
    fontFamily: node.heading ? '"优设标题黑", "YouSheBiaoTiHei", sans-serif'
      : node.fontName?.family === 'Manrope' ? 'Manrope, Arial, sans-serif' : undefined,
    whiteSpace: englishDisplay ? 'pre' : undefined,
    letterSpacing: node.fontName?.family === 'Manrope' ? '-.025em' : undefined,
  } as CSSProperties;
  const className = [styles.node, node.asset ? styles.asset : '',
    node.cornerRadius && node.cornerRadius >= 8 ? styles.card : '',
    node.type === 'RECTANGLE' || node.name.startsWith('场景下沿') ? styles.decor : '',
    node.heading ? styles.heading : '', englishDisplay ? styles.displayText : ''].filter(Boolean).join(' ');
  const common = {
    'data-node-id': node.id, 'data-name': node.name, 'data-layout': node.layoutMode,
    'data-asset': node.asset, 'data-heading': node.heading || undefined,
    'data-header': node.name.includes('页头') || undefined,
    'data-connection': node.name.includes('连线') || undefined,
    className, style,
  };
  if (node.leader !== undefined) {
    const end = u(answerTargets[node.leader]);
    const start = `calc(${noteTops[node.leader]} + 35 * var(--u) + 20px)`;
    const downward = notes[node.leader].y + notes[node.leader].h / 2 < answerTargets[node.leader];
    return <svg {...common} className={`${className} ${styles.leader}`} aria-hidden="true"
      viewBox="0 0 96 100" preserveAspectRatio="none"
      style={{ ...style, left: u(488), top: `min(${start}, ${end})`, width: u(96), height: `max(1px, calc(${start} - ${end}), calc(${end} - ${start}))`, overflow: 'visible' }}>
      <path d={downward ? 'M0 0 H46 V100 H96' : 'M0 100 H46 V0 H96'} fill="none" stroke="#138c78" opacity=".72"
        strokeWidth="1.25" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
    </svg>;
  }
  if (node.paths) return <svg {...common} aria-hidden="true" viewBox={`0 0 ${node.w || 1} ${node.h || 1}`}>
    {node.paths.map((path, i) => <path key={i} d={path.data} fill={color(fill) ?? 'none'}
      fillRule={path.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero'}
      stroke={color(stroke)} strokeWidth={node.strokeWeight} />)}
  </svg>;
  if (node.asset) return <div {...common}><Figure node={node} />
    {node.asset === 'answer' && chapter === 7 ? <span className={styles.answerFocus} aria-hidden="true" /> : null}</div>;
  if (node.heading === 1) return <h1 {...common}>「<span className={styles.brandAccent}>合一</span>空间 OS」</h1>;
  if (node.heading === 2) return <h2 {...common}>{node.text}</h2>;
  if (node.text) return <p {...common} aria-hidden={englishDisplay && /[A-Z]{3}/.test(node.text) ? true : undefined}>{node.text}</p>;
  const children = node.children?.map(child => <DesignNode key={child.id} node={child} chapter={chapter} />);
  if (node.answer !== undefined) return <button {...common} data-answer={node.answer}
    aria-pressed={node.answer === 0} aria-label={`高亮回答：${answerLabels[node.answer]}`}
    className={`${className} ${styles.answerButton}`}
    style={{ ...style, top: noteTops[node.answer], height: noteHeight, borderRadius: 12 }}>{children}</button>;
  return <div {...common}>{children}</div>;
}

export default function CurrentCase() {
  return <main className={styles.case}><CaseNav projectLabel="HEYISPACE OS" />
    <a className={styles.skip} href="#chapter-02">跳至案例内容</a>
    <div className={styles.background} data-case-background aria-hidden="true" />
    <CaseExperience chapters={chapters.map((chapter, i) => ({ id: String(i + 1).padStart(2, '0'), title: chapter.title ?? '' }))}>
      <div className={styles.canvas}>{chapters.slice(0, 1).map((chapter, i) => <section className={`${styles.chapter} ${styles.fullBleedChapter}`}
        id={`chapter-${String(i + 1).padStart(2, '0')}`} data-chapter={String(i + 1).padStart(2, '0')}
        key={chapter.id} aria-label={`${i + 1} ${chapter.title}`}
        style={{ height: i === 6 ? `calc(${u(chapter.h)} + ${answerExtra})` : u(chapter.h) }}>
        <DesignNode node={chapter} chapter={i + 1} />
      </section>)}</div>
      <EditorialSections />
      <footer className={styles.footer}><Link href="/#work">返回作品</Link><a href="#chapter-01">返回顶部 ↑</a></footer>
    </CaseExperience>
  </main>;
}
