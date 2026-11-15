import Image from '@/components/SiteImage';
import s from './component-delivery.module.css';

const base = '/cases/implementation-assistant/component-delivery/';
function RowImage({ name, width, height, alt }: { name: string; width: number; height: number; alt: string }) {
  return <Image unoptimized src={`${base}${name}.png`} width={width} height={height} alt={alt} />;
}
const taskRules = [
  ['等待 · 本次补充', '已提交，尚未开始执行', '显示“等待添加”，与执行中的进度符号区分', '暂不增加停止入口；队列事件与操作待研发确认'],
  ['执行中', '设备正在添加', '名称下显示“正在添加”，右侧显示进度符号', '原稿未展示停止操作'],
  ['成功', '设备已添加', '已完成页保留设备与版本；低版本设备另列升级项', '可选择升级或忽略低版本设备'],
  ['失败', '添加超时', '失败页显示原因，并用勾选明确重新添加范围', '一键重新添加所选失败设备'],
];

/** Retrospective documentation of shipped UI, not a claim of a historic complete library. */
export function ComponentRules() {
  return <section id="component-rules" data-chapter="11A" className={s.section} aria-labelledby="component-rules-title">
    <header className={s.header}><div><p className={s.eyebrow}>COMPONENTS & STATES</p><h2 id="component-rules-title">组件如何承载<br />业务状态</h2></div><div><p>选择时说明“对哪些设备操作”，提交后说明“每台设备处理到哪一步”。只拆解设备选择行与添加任务条目。</p><p className={s.provenance}>基于已上线界面整理的组件与状态规则 · 本次复盘整理</p></div></header>
    <div className={s.selectionGrid}>
      <article className={s.card} data-card="selection-anatomy"><p className={s.kicker}>01 / 设备选择列表行</p><h3>对象不变，选择状态改变</h3>
        <div className={s.rowSamples}>
          <div><span>普通 / 未选中</span><RowImage name="device-default" width={253} height={63} alt="未选中设备行：空心复选框、设备图标、名称、MAC与独立右侧入口" /></div>
          <div><span>选中</span><RowImage name="device-selected" width={253} height={63} alt="选中设备行：绿色勾选，保留设备名称与MAC" /></div>
        </div>
        <dl className={s.anatomy}><div><dt>固定结构</dt><dd>复选框 → 类型图标 → 名称与 MAC → 右侧入口。</dd></div><div><dt>可变内容</dt><dd>设备类型、名称、MAC 与勾选值；选中后仍保留对象信息。</dd></div><div><dt>选择范围</dt><dd>类型分类与设备行分开。提交按钮显示已选数量，原稿示例为“一键添加(7)”。</dd></div></dl>
      </article>
      <figure className={`${s.card} ${s.application}`}><figcaption><p className={s.kicker}>真实页面应用</p><h3>明确本次选择范围</h3></figcaption><div className={s.selectionScreen}><Image unoptimized src={`${base}selection-source.png`} width={375} height={812} alt="添加设备原稿：左侧类型分类，右侧设备多选，底部一键添加(7)" /></div></figure>
    </div>
    <div className={s.selectionRule}><span>触发：勾选 / 取消设备</span><span>反馈：空心圆 / 实心勾选</span><span>操作：按已选数量提交添加</span></div>
    <article className={`${s.card} ${s.tasks}`} data-card="task-anatomy"><div className={s.taskHeading}><div><p className={s.kicker}>02 / 批量添加任务条目</p><h3>结果反馈与后续操作分开</h3></div><p>条目固定保留设备图标与名称。状态文字、进度符号和选择控件随处理阶段变化。</p></div>
      <div className={s.taskSamples}>{[['task-waiting','等待 · 本次补充建议，未上线','本次补充的等待态：设备名称 + 等待添加，不显示执行中加载符号'],['task-running','执行中 · 历史原稿','设备名称 + 正在添加 + 进度符号'],['task-success','已添加 · 历史原稿','设备名称 + 当前版本'],['task-failed','失败 / 已选中 · 历史原稿','设备名称 + 添加超时 + 重新添加范围']].map(([name,title,alt])=><figure key={name}><figcaption>{title}</figcaption><RowImage name={name} width={319} height={56} alt={alt} /></figure>)}</div>
      <div className={s.rules} role="table" aria-label="添加任务状态规则"><div className={s.ruleHead} role="row"><span role="columnheader">状态</span><span role="columnheader">触发条件</span><span role="columnheader">界面反馈</span><span role="columnheader">可用操作 / 证据边界</span></div>{taskRules.map(([state,trigger,feedback,action])=><div role="row" key={state} data-state={state}><strong role="cell">{state}</strong><p role="cell"><span className={s.mobileLabel}>触发条件</span>{trigger}</p><p role="cell"><span className={s.mobileLabel}>界面反馈</span>{feedback}</p><p role="cell"><span className={s.mobileLabel}>可用操作</span>{action}</p></div>)}</div>
    </article>
    <p className={s.footnote}>源 Figma 已有列表主组件、实例、图标替换及复选框属性。本次在独立页归组选择与任务变体，补出等待态；等待态未上线，需研发确认。各截图为独立状态示例，不构成同一批任务的连续记录，也不代表任职时已建立完整设计系统。</p>
    <a className={s.figmaLink} href="https://www.figma.com/design/33eNMNohTOALwaWmNum39C/LG?node-id=1278-17817" target="_blank" rel="noreferrer">查看本次整理的可编辑组件 <span aria-hidden="true">↗</span></a>
  </section>;
}

export function DeliveryRules() {
  return <section id="delivery-rules" data-chapter="12A" className={s.section} aria-labelledby="delivery-rules-title">
    <header className={s.header}><div><p className={s.eyebrow}>DELIVERY & ACCEPTANCE</p><h2 id="delivery-rules-title">开发交付与<br />验收规则</h2></div><div><p>围绕“绑定修改后退出”，把触发条件、反馈和操作结果写成可核对的规则，再用使用手册承接现场操作。</p><p className={s.provenance}>本次复盘整理 · 依据历史设计稿与已交付手册</p></div></header>
    <div className={s.deliveryGrid}>
      <figure className={`${s.card} ${s.saveEvidence}`}><figcaption><p className={s.kicker}>设计依据 / 未保存退出提醒</p><h3>退出前，确认修改的去向</h3></figcaption><div className={s.saveCrop}><Image unoptimized src="/cases/implementation-assistant/screens/binding-integrity/06-unsaved-exit-warning.png" width={750} height={1624} alt="原设计稿的未保存退出确认：提示修改将丢失，提供立即保存和放弃修改" /></div><p className={s.sourceLabel}>历史设计稿局部 · 非历史实现截图</p></figure>
      <article className={`${s.card} ${s.acceptance}`} data-card="acceptance-rules"><p className={s.kicker}>交付时说清楚什么</p><h3>核对后果，不只核对样式</h3><ol>
        <li><span>01</span><div><h4>触发条件</h4><p>绑定关系已有修改、尚未保存，用户尝试退出。</p></div></li>
        <li><span>02</span><div><h4>界面反馈</h4><p>退出前说明修改将丢失，保留“立即保存”和“放弃修改”两项操作。</p></div></li>
        <li><span>03</span><div><h4>预期结果</h4><p>选择保存时核对修改是否保留；选择放弃时核对修改是否被丢弃，不能静默丢失。</p></div></li>
        <li><span>04</span><div><h4>复核边界</h4><p>保存失败反馈、接口返回与退出时机需结合实现确认；该弹窗不能证明同步已完成。</p></div></li>
      </ol><p className={s.reviewNote}>验收清单：对象范围 → 触发条件 → 操作文案 → 实际结果。此处展示验收依据，不将复盘整理写成历史问题单或已通过的测试结果。</p></article>
    </div>
    <div className={s.manualHeading}><div><p className={s.kicker}>已交付的图文使用手册</p><h3>从界面规则，接到现场操作</h3></div><p>本人主编，参与产品交接与实操培训。以下节选来自真实“添加网关”文档。</p></div>
    <div className={s.manualGrid}>
      <ManualPart name="manual-directory" title="按任务找章节" body="目录覆盖空间、网络、网关、设备与异常提醒。" width={315} height={400} />
      <ManualPart name="manual-operation" title="关键操作有图示" body="说明如何进入网关配网页面，并标出添加入口。" width={700} height={600} />
      <ManualPart name="manual-exceptions" title="注意事项可定位" body="章节目录单列 Wi-Fi 频段、未联网及已被占用的网关。" width={445} height={205} />
    </div>
    <p className={s.footnote}>历史材料支持本人参与设计走查、测试验收与手册交付；现存材料缺少可核对的实现前后截图及具体问题流转记录，因此本页不构造一次“发现—协商—修复”的历史故事。约 7 分钟演示仍仅指单次标准房间配置，计时不含固件升级。</p>
  </section>;
}
function ManualPart({name,title,body,width,height}:{name:string;title:string;body:string;width:number;height:number}) {
  return <figure className={`${s.card} ${s.manualPart}`}><figcaption><h4>{title}</h4><p>{body}</p></figcaption><div className={s.manualImage}><RowImage name={name} width={width} height={height} alt={`真实飞书使用手册节选：${title}`} /></div></figure>;
}
