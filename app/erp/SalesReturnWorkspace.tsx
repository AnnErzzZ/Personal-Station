'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import Dialog from './Dialog';
import ListFilters from './ListFilters';
import SalesReturnEditor from './SalesReturnEditor';
import { defaultFilters, selectRecords } from './filters';
import { duplicateSalesReturns, salesReturnLabels, salesReturnQuantities, type Command, type SalesReturn, type Workspace } from './model';
import s from './erp.module.css';

type Overlay = { type: 'new' | 'edit' | 'detail' | 'confirm' | 'cancel'; id?: string; snapshot?: SalesReturn };
const time = (at: string) => new Date(at).toLocaleString('zh-CN', { hour12: false });
const badge = { draft: s.draft, received: s.shipped, cancelled: s.cancelled };
export default function SalesReturnWorkspace({ data, busy, initialId, initialOrderId, create, onMutate, onReload, onGuard, onOrder, onLedger, onStock }: {
  data: Workspace; busy: boolean; initialId?: string; initialOrderId?: string; create?: boolean;
  onMutate: (command: Command) => Promise<Workspace>; onReload: () => Promise<Workspace>;
  onGuard: (guard: (() => boolean) | null) => void; onOrder: (id: string) => void; onLedger: (id: string) => void; onStock: (id: string) => void;
}) {
  const [filters, setFilters] = useState({ ...defaultFilters, sourceOrder: initialOrderId ?? 'all' });
  const [overlay, setOverlay] = useState<Overlay | null>(create ? { type: 'new' } : initialId ? { type: 'detail', id: initialId } : null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const guard = () => !dirty || window.confirm('退货单有未保存的修改。离开将放弃这些修改，确定离开吗？');
    onGuard(guard);
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => { onGuard(null); window.removeEventListener('beforeunload', unload); };
  }, [dirty, onGuard]);
  const close = () => { if (!busy && (!dirty || window.confirm('放弃退货单中未保存的修改吗？'))) setOverlay(null); };
  const open = (type: Overlay['type'], id?: string) => { setNotice(''); setOverlay({ type, id, snapshot: type === 'confirm' || type === 'cancel' ? structuredClone(data.salesReturns.find(r => r.id === id)) : undefined }); };
  const current = data.salesReturns.find(r => r.id === overlay?.id);
  const doc = overlay?.snapshot ?? current;
  const revisionChanged = Boolean(doc && current && (doc.revision !== current.revision || doc.status !== current.status));
  const { salesReturns } = selectRecords(data, 'salesReturns', filters);
  const stats = [['全部退货单', data.salesReturns.length], ['待验收草稿', data.salesReturns.filter(r => r.status === 'draft').length], ['已入库', data.salesReturns.filter(r => r.status === 'received').length], ['已取消', data.salesReturns.filter(r => r.status === 'cancelled').length]];
  return <>
    <div className={s.pageHead}><div><h1>销售退货</h1><p>关联原销售，收到合格商品后确认退货入库。</p></div><button type="button" className={s.primary} disabled={busy} onClick={() => open('new')}><IconPlus size={18} />新建退货单</button></div>
    <div className={s.metrics}>{stats.map(([label, value]) => <div className={s.metric} key={String(label)}><div className={s.metricTop}>{label}</div><div className={s.metricValue}>{value}<span>笔</span></div></div>)}</div>
    {notice && <p className={s.success} role="status">{notice}</p>}
    <section className={s.panel} aria-label="销售退货">
      <div className={s.panelHeading}><h2>退货单列表<span>{salesReturns.length}</span></h2><span className={s.panelCaption}>主仓库 · 合格实收后入库</span></div>
      <div className={s.toolbar}><label className={s.search}><IconSearch size={18} /><input aria-label="搜索退货" placeholder="搜索退货单、原单、客户或商品" value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} /></label><button type="button" className={s.filterButton} onClick={() => setFilters({ ...defaultFilters })}>重置筛选</button></div>
      <ListFilters view="salesReturns" data={data} value={filters} onChange={setFilters} />
      {filters.sourceOrder !== 'all' && <div className={s.receiptScope}>原订单：{data.orders.find(o => o.id === filters.sourceOrder)?.number}<button type="button" className={s.textButton} onClick={() => setFilters(f => ({ ...f, sourceOrder: 'all' }))}>清除原订单筛选</button></div>}
      <div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>退货单号 / 创建时间</th><th>原订单</th><th>客户</th><th>商品种数</th><th>实收日期</th><th>状态</th><th>操作</th></tr></thead><tbody>{salesReturns.map(r => <tr key={r.id}><td><button type="button" className={s.orderNumber} onClick={() => open('detail', r.id)}>{r.number}</button><small>{time(r.createdAt)}</small></td><td><button type="button" className={s.textButton} onClick={() => onOrder(r.orderId)}>{data.orders.find(o => o.id === r.orderId)?.number}</button></td><td>{r.customerName}</td><td>{r.lines.length} 种</td><td>{r.receiptDate || '待收货填写'}</td><td><span className={`${s.status} ${badge[r.status]}`}>{salesReturnLabels[r.status]}</span></td><td><button type="button" className={s.textButton} onClick={() => open('detail', r.id)}>查看详情</button></td></tr>)}</tbody></table></div>
      {!salesReturns.length && <div className={s.empty}><h3>{data.salesReturns.length ? '没有符合条件的退货单' : '还没有销售退货单'}</h3><p>从已出库订单登记退货，或调整筛选条件。</p></div>}
      <footer className={s.tableFooter}><span>草稿不改库存；只接收合格品；退款及坏品处理后续扩展。</span><span>本地单用户</span></footer>
    </section>
    {overlay && <Dialog key={`${overlay.type}-${overlay.id ?? ''}`} wide busy={busy} onClose={close} title={overlay.type === 'new' ? '新建销售退货单' : overlay.type === 'edit' ? '编辑退货草稿' : overlay.type === 'confirm' ? '确认销售退货入库' : overlay.type === 'cancel' ? '取消退货草稿' : '销售退货详情'}>
      {(overlay.type === 'new' || overlay.type === 'edit') && <SalesReturnEditor data={data} doc={overlay.type === 'edit' ? current : undefined} initialOrderId={initialOrderId} busy={busy} onDirty={setDirty} onClose={close} onSave={async input => { const next = await onMutate({ type: 'save-sales-return', ...input }); setOverlay({ type: 'detail', id: input.salesReturnId ?? next.salesReturns.at(-1)!.id }); setNotice('退货草稿已保存，库存未变。收到并验收合格后再确认入库。'); }} />}
      {doc && !['new', 'edit'].includes(overlay.type) && <div className={s.detail}>
        <div className={s.orderHero}><div><span className={s.detailOverline}>主仓库 · 销售退货</span><h3>{doc.number}</h3></div><span className={`${s.status} ${badge[doc.status]}`}>{salesReturnLabels[doc.status]}</span></div>
        <div className={s.detailFacts}><div>客户<strong>{doc.customerName}</strong></div><div>实收日期<strong>{doc.receiptDate || '待收货填写'}</strong></div><div>原订单<strong>{data.orders.find(o => o.id === doc.orderId)?.number}</strong></div><div>原出库单<strong>{doc.shipmentNumber}</strong></div><div>创建时间<strong>{time(doc.createdAt)}</strong></div><div>确认时间<strong>{doc.confirmedAt ? time(doc.confirmedAt) : '尚未入库'}</strong></div></div>
        <div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>原单商品</th><th>原出库</th><th>当前累计已退</th><th>当前剩余可退</th><th>本次数量</th><th>退货原因</th></tr></thead><tbody>{doc.lines.map(l => { const q = salesReturnQuantities(data, doc.orderId, l.productId); return <tr key={l.productId}><td><strong>{l.productName}</strong><small>{l.sku} · {l.unit}{data.products.find(p => p.id === l.productId)?.active === false ? ' · 已停用' : ''}</small>{doc.status === 'received' && <button type="button" className={s.textButton} onClick={() => onStock(l.productId)}>查看库存</button>}</td><td>{q.shipped}</td><td>{q.returned}</td><td>{q.remaining}</td><td>{l.quantity} {l.unit}</td><td className={s.returnReason}>{l.reason}</td></tr>; })}</tbody></table></div>
        {doc.note && <div className={s.note}><span>退货备注</span><p>{doc.note}</p></div>}
        {doc.cancelReason && <p className={s.warning}>取消原因：{doc.cancelReason}</p>}
        {revisionChanged && <p className={s.warning} role="alert">本单已在其他页面更新，请返回详情重新核对。</p>}
        {(overlay.type === 'confirm' || overlay.type === 'cancel') && <SalesReturnOperation key={`${overlay.type}-${doc.id}-${current?.revision}-${duplicateSalesReturns(data, doc).map(r => r.id).join(',')}`} doc={doc} data={data} busy={busy} cancelling={overlay.type === 'cancel'} stale={revisionChanged} onSubmit={async (reason, accepted, allowDuplicate) => {
          try { await onMutate(overlay.type === 'cancel' ? { type: 'cancel-sales-return', salesReturnId: doc.id, revision: doc.revision, reason } : { type: 'confirm-sales-return', salesReturnId: doc.id, revision: doc.revision, accepted, allowDuplicate }); }
          catch (error) { await onReload().catch(() => undefined); throw error; }
          setOverlay({ type: 'detail', id: doc.id }); setNotice(overlay.type === 'cancel' ? '退货草稿已取消，库存未变。' : '销售退货已验收入库，库存与流水已更新。');
        }} />}
        <h4 className={s.historyTitle}>操作记录</h4><ol className={s.history}>{doc.history.toReversed().map((event, index) => <li key={`${event.at}-${index}`}><span className={s.historyDot} /><div>{event.action}<small>{event.actor} · {time(event.at)}</small></div></li>)}</ol>
        <footer className={s.dialogFoot}><span className={s.helper}>{doc.status === 'received' ? '入库结果只读；本期暂不支持退货单冲销及更正。' : '确认前按实际合格实收数量核对，退款后续处理。'}</span><div className={s.actions}>
          <button type="button" className={s.secondary} disabled={busy} onClick={() => onOrder(doc.orderId)}>查看原订单</button>
          {doc.status === 'draft' && overlay.type === 'detail' && <><button type="button" className={s.secondary} disabled={busy} onClick={() => open('edit', doc.id)}>编辑草稿</button><button type="button" className={s.dangerButton} disabled={busy} onClick={() => open('cancel', doc.id)}>取消退货单</button><button type="button" className={s.primary} disabled={busy} onClick={() => open('confirm', doc.id)}>确认退货入库</button></>}
          {doc.status === 'received' && <button type="button" className={s.secondary} onClick={() => onLedger(doc.id)}>查看本单流水</button>}
          {(overlay.type === 'confirm' || overlay.type === 'cancel') && <button type="button" className={s.secondary} disabled={busy} onClick={() => open('detail', doc.id)}>返回详情</button>}
        </div></footer>
      </div>}
    </Dialog>}
  </>;
}

function SalesReturnOperation({ doc, data, busy, cancelling, stale, onSubmit }: { doc: SalesReturn; data: Workspace; busy: boolean; cancelling: boolean; stale: boolean; onSubmit: (reason: string, accepted: boolean, allowDuplicate: boolean) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [error, setError] = useState('');
  const duplicates = duplicateSalesReturns(data, doc);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); try { await onSubmit(reason, accepted, allowDuplicate); } catch (error) { setError(error instanceof Error ? error.message : '操作失败'); } }
  return <form className={s.receiptOperation} onSubmit={submit}>
    <p className={s.helper}>{cancelling ? '取消草稿不改变库存，原单及原因保留。' : '请核对以上商品和本次数量。确认后整单增加库存，单据只读；本期仅接收合格品，不记录退款。'}</p>
    {error && <p className={s.error} role="alert">{error}</p>}
    {!cancelling && !doc.receiptDate && <p className={s.warning}>尚未填写实收日期，请返回详情编辑草稿后再确认。</p>}
    <fieldset className={s.fieldset} disabled={busy || stale}>
      {cancelling ? <label className={s.field}>取消原因 <span>*</span><textarea required maxLength={300} rows={2} aria-label="取消退货原因" value={reason} onChange={e => setReason(e.target.value)} /></label> : <>
        {duplicates.length > 0 && <div className={s.warning}><p>发现疑似重复退货：{duplicates.map(r => r.number).join('、')}。同一原单、实收日期和商品数量已有入库记录，请先核对。</p><label className={s.duplicateCheck}><input type="checkbox" aria-label="已核对疑似重复退货" checked={allowDuplicate} onChange={e => setAllowDuplicate(e.target.checked)} />我已核对，确认这是另一次实际收货，继续本次入库。</label></div>}
        <label className={s.duplicateCheck}><input type="checkbox" aria-label="确认退货已收妥并验收合格" checked={accepted} onChange={e => setAccepted(e.target.checked)} />本单商品已收到并验收合格，可按本次数量入库。</label>
      </>}
      <button type="submit" className={cancelling ? s.dangerSolid : s.primary} disabled={busy || stale || (!cancelling && (!accepted || !doc.receiptDate || (duplicates.length > 0 && !allowDuplicate)))}>{busy ? '处理中…' : cancelling ? '确认取消退货单' : '确认验收并入库'}</button>
    </fieldset>
  </form>;
}
