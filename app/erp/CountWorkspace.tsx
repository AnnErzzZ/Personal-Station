'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconArrowRight, IconPlus, IconSearch } from '@tabler/icons-react';
import CountEditor from './CountEditor';
import Dialog from './Dialog';
import ListFilters from './ListFilters';
import { defaultFilters, selectRecords } from './filters';
import { countLabels, countLineStale, type Command, type StockCount, type Workspace } from './model';
import s from './erp.module.css';

type Overlay = { type: 'new' | 'edit' | 'detail' | 'confirm' | 'cancel'; id?: string; snapshot?: StockCount };
const time = (at: string) => new Date(at).toLocaleString('zh-CN', { hour12: false });
const badge = { draft: s.draft, confirmed: s.shipped, cancelled: s.cancelled };

export default function CountWorkspace({ data, busy, initialId, onMutate, onReload, onLedger, onGuard }: {
  data: Workspace; busy: boolean; initialId?: string; onMutate: (command: Command) => Promise<Workspace>;
  onReload: () => Promise<Workspace>; onLedger: (id: string) => void; onGuard: (guard: (() => boolean) | null) => void;
}) {
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [overlay, setOverlay] = useState<Overlay | null>(initialId ? { type: 'detail', id: initialId } : null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const guard = () => !dirty || window.confirm('盘点单有未保存的修改。离开将放弃这些修改，确定离开吗？');
    onGuard(guard);
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => { onGuard(null); window.removeEventListener('beforeunload', unload); };
  }, [dirty, onGuard]);
  const close = () => { if (!dirty || window.confirm('放弃盘点单中未保存的修改吗？')) setOverlay(null); };
  const open = (type: Overlay['type'], id?: string) => { setNotice(''); setOverlay({ type, id, snapshot: type === 'confirm' || type === 'cancel' ? structuredClone(data.counts.find(c => c.id === id)) : undefined }); };
  const current = data.counts.find(c => c.id === overlay?.id);
  const count = overlay?.snapshot ?? current;
  const stale = Boolean(count && count.lines.some(l => countLineStale(data, l)));
  const { counts } = selectRecords(data, 'counts', filters);
  const stats = [['全部盘点单', data.counts.length], ['待确认草稿', data.counts.filter(c => c.status === 'draft').length], ['已确认', data.counts.filter(c => c.status === 'confirmed').length], ['需重新核对', data.counts.filter(c => c.status === 'draft' && c.lines.some(l => countLineStale(data, l))).length]];
  return <>
    <div className={s.pageHead}><div><h1>库存盘点</h1><p>清点实物、核对差异，让账面库存与实物保持一致。</p></div><button type="button" className={s.primary} disabled={busy} onClick={() => open('new')}><IconPlus size={18} />新建盘点单</button></div>
    <div className={s.metrics}>{stats.map(([label, value]) => <div className={s.metric} key={String(label)}><div className={s.metricTop}>{label}</div><div className={s.metricValue}>{value}<span>笔</span></div></div>)}</div>
    {notice && <div className={s.success} role="status">{notice}<button type="button" aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    <section className={s.panel} aria-label="库存盘点">
      <div className={s.panelHeading}><h2>盘点单列表<span>{counts.length}</span></h2><span className={s.panelCaption}>主仓库 · 确认后按差异调整库存</span></div>
      <div className={s.toolbar}><label className={s.search}><IconSearch size={18} /><input aria-label="搜索" placeholder="搜索盘点单号、商品或备注" value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} />{filters.query && <button type="button" aria-label="清空搜索" onClick={() => setFilters(f => ({ ...f, query: '' }))}>×</button>}</label><button type="button" className={s.filterButton} onClick={() => setFilters({ ...defaultFilters })}>重置筛选</button></div>
      <ListFilters view="counts" data={data} value={filters} onChange={setFilters} />
      <div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>盘点单号 / 创建时间</th><th>盘点范围</th><th>差异商品</th><th>状态</th><th>核对情况</th><th className={s.right}>操作</th></tr></thead><tbody>{counts.map(c => {
        const changed = c.status === 'draft' && c.lines.some(l => countLineStale(data, l));
        return <tr key={c.id}><td><button className={s.orderNumber} type="button" onClick={() => open('detail', c.id)}>{c.number}</button><small>{time(c.createdAt)}</small></td><td>{c.lines.length} 种商品<small>主仓库</small></td><td>{c.lines.filter(l => l.actualQuantity !== l.bookQuantity).length} 种</td><td><span className={`${s.status} ${badge[c.status]}`}>{countLabels[c.status]}</span></td><td>{changed ? <span className={s.dangerText}>库存已变化，须复核</span> : c.status === 'draft' ? '待核对并确认' : c.status === 'confirmed' ? '盘点结果已记录' : '库存未变更'}</td><td className={s.right}><button className={s.textButton} type="button" onClick={() => open('detail', c.id)}>查看详情<IconArrowRight size={15} /></button></td></tr>;
      })}</tbody></table></div>
      {!counts.length && <div className={s.empty}><h3>{data.counts.length ? '没有符合条件的盘点单' : '还没有盘点单'}</h3><p>{data.counts.length ? '调整筛选条件，或重置筛选。' : '新建盘点单，选择商品后清点实物并录入数量。'}</p></div>}
      <footer className={s.tableFooter}><span>草稿不改库存；有差异须填写原因；零差异也保留盘点单。</span><span>本地单用户</span></footer>
    </section>
    {overlay && <Dialog key={`${overlay.type}-${overlay.id ?? ''}`} wide busy={busy} title={overlay.type === 'new' ? '新建库存盘点单' : overlay.type === 'edit' ? '编辑盘点草稿' : overlay.type === 'confirm' ? '确认库存盘点' : overlay.type === 'cancel' ? '取消盘点草稿' : '库存盘点详情'} onClose={close}>
      {(overlay.type === 'new' || overlay.type === 'edit') && <CountEditor data={data} count={overlay.type === 'edit' ? current : undefined} busy={busy} onDirty={setDirty} onClose={close} onReload={onReload} onSave={async input => { const next = await onMutate({ type: 'save-count', ...input }); setOverlay({ type: 'detail', id: input.countId ?? next.counts.at(-1)!.id }); setNotice('盘点草稿已保存，库存未变。核对差异后再确认盘点。'); }} />}
      {count && !['new', 'edit'].includes(overlay.type) && <div className={s.detail}>
        <div className={s.orderHero}><div><span className={s.detailOverline}>主仓库 · 库存盘点</span><h3>{count.number}</h3></div><span className={`${s.status} ${badge[count.status]}`}>{countLabels[count.status]}</span></div>
        {notice && <p className={s.success} role="status">{notice}</p>}
        <div className={s.detailFacts}><div>创建时间<strong>{time(count.createdAt)}</strong></div><div>确认时间<strong>{count.confirmedAt ? time(count.confirmedAt) : '尚未确认'}</strong></div><div>盘点范围<strong>{count.lines.length} 种商品 · 差异 {count.lines.filter(l => l.actualQuantity !== l.bookQuantity).length} 种</strong></div></div>
        {count.status === 'draft' && stale && <p className={s.warning} role="alert">盘点商品的库存流水已变化，原实盘数量不能直接确认。请编辑草稿，逐行重新核对并清点。</p>}
        <div className={s.tableScroll}><table className={`${s.dataTable} ${s.countDetailTable}`}><thead><tr><th>商品</th><th>账面数量</th><th>实盘数量</th><th>差异</th><th>差异原因</th></tr></thead><tbody>{count.lines.map(l => { const diff = l.actualQuantity - l.bookQuantity; return <tr key={l.productId}><td><strong>{l.productName}</strong><small>{l.sku} · {l.unit}</small></td><td>{l.bookQuantity}</td><td>{l.actualQuantity}</td><td className={diff > 0 ? s.positive : diff < 0 ? s.dangerText : ''}>{diff > 0 ? `+${diff}` : diff}{count.status === 'draft' && countLineStale(data, l) && <small className={s.dangerText}>须重新核对</small>}</td><td className={s.countReason}>{l.reason || '无差异'}</td></tr>; })}</tbody></table></div>
        {count.note && <div className={s.note}><span>盘点备注</span><p>{count.note}</p></div>}
        {count.cancelReason && <p className={s.warning}>取消原因：{count.cancelReason}</p>}
        {(overlay.type === 'confirm' || overlay.type === 'cancel') && <CountOperation key={`${overlay.type}-${count.id}`} count={count} busy={busy} cancelling={overlay.type === 'cancel'} stale={stale} onSubmit={async reason => { await onMutate(overlay.type === 'cancel' ? { type: 'cancel-count', countId: count.id, revision: count.revision, reason } : { type: 'confirm-count', countId: count.id, revision: count.revision }); setOverlay({ type: 'detail', id: count.id }); setNotice(overlay.type === 'cancel' ? '盘点草稿已取消，库存未变。' : '盘点已确认，差异已更新库存，盘点结果已保留。'); }} />}
        <h4 className={s.historyTitle}>操作记录</h4><ol className={s.history}>{count.history.toReversed().map((event, index) => <li key={`${event.at}-${index}`}><span className={s.historyDot} /><div>{event.action}<small>{event.actor} · {time(event.at)}</small></div></li>)}</ol>
        <footer className={s.dialogFoot}><span className={s.helper}>{count.status === 'confirmed' ? '确认后的盘点结果只读，后续差异请重新盘点。' : '确认前请核对实物和差异原因。'}</span><div className={s.actions}>
          {count.status === 'draft' && overlay.type === 'detail' && <><button type="button" className={s.secondary} disabled={busy} onClick={() => open('edit', count.id)}>编辑草稿</button><button type="button" className={s.dangerButton} disabled={busy} onClick={() => open('cancel', count.id)}>取消盘点单</button><button type="button" className={s.primary} disabled={busy || stale} onClick={() => open('confirm', count.id)}>确认盘点</button></>}
          {count.status === 'confirmed' && <button type="button" className={s.secondary} onClick={() => onLedger(count.id)}>查看本单流水</button>}
          {(overlay.type === 'confirm' || overlay.type === 'cancel') && <button type="button" className={s.secondary} disabled={busy} onClick={() => open('detail', count.id)}>返回详情</button>}
        </div></footer>
      </div>}
    </Dialog>}
  </>;
}

function CountOperation({ count, busy, cancelling, stale, onSubmit }: { count: StockCount; busy: boolean; cancelling: boolean; stale: boolean; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); try { await onSubmit(reason); } catch (error) { setError(error instanceof Error ? error.message : '操作失败'); } }
  return <form className={s.receiptOperation} onSubmit={submit}>
    <p className={s.helper}>{cancelling ? '取消草稿不改变库存，原单和操作记录保留。' : `本单 ${count.lines.length} 种商品，${count.lines.filter(l => l.actualQuantity > l.bookQuantity).length} 种盘盈、${count.lines.filter(l => l.actualQuantity < l.bookQuantity).length} 种盘亏。确认后整单调整库存并生成差异流水，结果只读。`}</p>
    {error && <p className={s.error} role="alert">{error}</p>}
    <fieldset disabled={busy} className={s.fieldset}>
      {cancelling ? <label className={s.field}>取消原因 <span>*</span><textarea required aria-label="取消盘点原因" maxLength={300} rows={2} value={reason} onChange={e => setReason(e.target.value)} /></label> : <label className={s.duplicateCheck}><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />我已核对上述实盘数量和差异原因，确认按差异调整库存。</label>}
      <button type="submit" className={cancelling ? s.dangerSolid : s.primary} disabled={busy || (!cancelling && (!checked || stale))}>{busy ? '处理中…' : cancelling ? '确认取消盘点单' : '确认差异并更新库存'}</button>
    </fieldset>
  </form>;
}
