import NucleoIcon from "./NucleoIcon";
import s from "./page.module.css";

const TYPE_SCALE = [
  { label: "统计数值", size: 32, weight: 600 },
  { label: "房间标题", size: 26, weight: 600 },
  { label: "页面标题", size: 20, weight: 500 },
  { label: "模块标题", size: 16, weight: 600 },
  { label: "正文信息", size: 14, weight: 400 },
  { label: "辅助说明", size: 12, weight: 400 },
];

const NEUTRALS = [
  { label: "主要文字", hex: "#17191F" },
  { label: "辅助文字", hex: "#525966" },
  { label: "分割线", hex: "#E2E5EC" },
  { label: "表头背景", hex: "#F7F8FA" },
];

function SpecHeading({ number, title, note }: { number: string; title: string; note: string }) {
  return <header className={s.specHeading}><div><span>{number}</span><h3>{title}</h3></div><p>{note}</p></header>;
}

export default function InterfaceStandards() {
  return <div className={s.specWall} aria-label="界面设计规范">
    <article className={s.specPanel}>
      <SpecHeading number="01" title="字体与字号" note="中文信息与数字分工，层级由字号和字重共同区分。" />
      <div className={s.specFontPair}>
        <div><span>中文字体</span><strong>Noto Sans SC</strong></div>
        <div><span>数字字体</span><strong className={s.specNumerals}>DINPro</strong><small>编号、日期与统计数值</small></div>
      </div>
      <div className={s.specScaleHeading}><span>使用场景</span><span>字号 px / 字重</span></div>
      <div className={s.specTypeScale}>
        {TYPE_SCALE.map(({ label, size, weight }) => <div className={s.specTypeRow} key={label}>
          <p style={{ fontSize: size, fontWeight: weight }}>{label}</p>
          <code>{size}<span> / {weight}</span></code>
        </div>)}
      </div>
      <p className={s.specFootnote}>正文行高 1.7；数值按位对齐，单位与数值分开显示。</p>
    </article>

    <article className={s.specPanel}>
      <SpecHeading number="02" title="色彩体系" note="蓝色标记操作与选中，灰阶承载内容与结构。" />
      <div className={s.specBrandColor}><span>主色 / 操作与选中</span><strong>运维蓝</strong><code>#2054FF</code><NucleoIcon name="grid-layout" size={68} /></div>
      <div className={s.specAccentPair}>
        <div><i /><span>选中背景<code>#EDF2FF</code></span></div>
        <div><i /><span>悬停主色<code>#1643D7</code></span></div>
      </div>
      <div className={s.specNeutralGrid}>{NEUTRALS.map(({ label, hex }) => <div key={label}><i style={{ background: hex }} /><span>{label}<code>{hex}</code></span></div>)}</div>
      <div className={s.specSemanticColors}>
        <h4>异常提示</h4>
        <div><i style={{ background: "#B34639" }} /><span>故障 / 需关注</span><code>#B34639</code></div>
        <div><i style={{ background: "#916322" }} /><span>预警 / 需确认</span><code>#916322</code></div>
      </div>
      <p className={s.specFootnote}>状态始终带文字标签，避免只凭颜色判断处理进度。</p>
    </article>
  </div>;
}
