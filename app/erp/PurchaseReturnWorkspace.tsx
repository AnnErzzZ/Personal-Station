'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import Dialog from './Dialog';
import ListFilters from './ListFilters';
import PurchaseReturnEditor from './PurchaseReturnEditor';
import { defaultFilters, selectRecords } from './filters';
import { duplicatePurchaseReturns, purchaseReturnLabels, purchaseReturnQuantities, type Command, type PurchaseReturn, type Workspace } from './model';
import s from './erp.module.css';

type Overlay = { type: 'new' | 'edit' | 'detail' | 'confirm' | 'cancel'; id?: string; snapshot?: PurchaseReturn };
const time = (at: string) => new Date(at).toLocaleString('zh-CN', { hour12: false });
const badge = { draft: s.draft, returned: s.shipped, cancelled: s.cancelled };
export default function PurchaseReturnWorkspace({ data, busy, initialId, initialReceiptId, initialSupplierId, create, onMutate, onReload, onGuard, onReceipt, onLedger, onStock }: {
  data: Workspace; busy: boolean; initialId?: string; initialReceiptId?: string; initialSupplierId?: string; create?: boolean;
  onMutate: (command: Command) => Promise<Workspace>; onReload: () => Promise<Workspace>;
  onGuard: (guard: (() => boolean) | null) => void; onReceipt: (id: string) => void; onLedger: (id: string) => void; onStock: (id: string) => void;
}) {
  const [filters, setFilters] = useState({ ...defaultFilters, sourceReceipt: initialReceiptId ?? 'all', supplier: initialSupplierId ?? 'all' });
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
  const open = (type: Overlay['type'], id?: string) => { setNotice(''); setOverlay({ type, id, snapshot: type === 'confirm' || type === 'cancel' ? structuredClone(data.purchaseReturns.find(r => r.id === id)) : undefined }); };
  const current = data.purchaseReturns.find(r => r.id === overlay?.id);
  const doc = overlay?.snapshot ?? current;
  const revisionChanged = Boolean(doc && current && (doc.revision !== current.revision || doc.status !== current.status));
  const { purchaseReturns } = selectRecords(data, 'purchaseReturns', filters);
  const source = doc && data.receipts.find(r => r.id === doc.receiptId);
  const sourceInvalid = Boolean(doc && (!source || source.status !== 'received'));
  const stockShort = Boolean(doc && doc.lines.some(l => (data.products.find(p => p.id === l.productId)?.stock ?? 0) < l.quantity));
  const overLimit = Boolean(doc && doc.lines.some(l => purchaseReturnQuantities(data, doc.receiptId, l.productId).remaining < l.quantity));
  const stats = [['全部退货单', data.purchaseReturns.length], ['待交接草稿', data.purchaseReturns.filter(r => r.status === 'draft').length], ['已出库', data.purchaseReturns.filter(r => r.status === 'returned').length], ['已取消', data.purchaseReturns.filter(r => r.status === 'cancelled').length]];
  return <>
    <div className={s.pageHead}><div><h1>采购退货</h1><p>关联原入库，核对实物并交接退回供应商。</p></div><button type="button" className={s.primary} disabled={busy} onClick={() => open('new')}><IconPlus size={18} />新建采购退货单</button></div>
    <div className={s.metrics}>{stats.map(([label, value]) => <div className={s.metric} key={String(label)}><div className={s.metricTop}>{label}</div><div className={s.metricValue}>{value}<span>笔</span></div></div>)}</div>
    {notice && <p className={s.success} role="status">{notice}</p>}
    <section className={s.panel} aria-label="采购退货">
      <div className={s.panelHeading}><h2>采购退货单列表<span>{purchaseReturns.length}</span></h2><span className={s.panelCaption}>主仓库 · 实物交接后扣减库存</span></div>
      <div className={s.toolbar}><label className={s.search}><IconSearch size={18} /><input aria-label="搜索采购退货" placeholder="搜索采购退货单、原单、供应商或商品" value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} /></label><button type="button" className={s.filterButton} onClick={() => setFilters({ ...defaultFilters })}>重置筛选</button></div>
      <ListFilters view="purchaseReturns" data={data} value={filters} onChange={setFilters} />
      {filters.sourceReceipt !== 'all' && <div className={s.receiptScope}>原入库单：{data.receipts.find(o => o.id === filters.sourceReceipt)?.number}<button type="button" className={s.textButton} onClick={() => setFilters(f => ({ ...f, sourceReceipt: 'all' }))}>清除原入库单筛选</button></div>}
      <div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>退货单号 / 创建时间</th><th>原入库单</th><th>供应商</th><th>商品种数</th><th>实际退货日期</th><th>状态</th><th>操作</th></tr></thead><tbody>{purchaseReturns.map(r => <tr key={r.id}><td><button type="button" className={s.orderNumber} onClick={() => open('detail', r.id)}>{r.number}</button><small>{time(r.createdAt)}</small></td><td><button type="button" className={s.textButton} onClick={() => onReceipt(r.receiptId)}>{data.receipts.find(o => o.id === r.receiptId)?.number}</button></td><td>{r.supplierName}</td><td>{r.lines.length} 种</td><td>{r.returnDate || '待交接填写'}</td><td><span className={`${s.status} ${badge[r.status]}`}>{purchaseReturnLabels[r.status]}</span></td><td><button type="button" className={s.textButton} onClick={() => open('detail', r.id)}>查看详情</button></td></tr>)}</tbody></table></div>
      {!purchaseReturns.length && <div className={s.empty}><h3>{data.purchaseReturns.length ? '没有符合条件的退货单' : '还没有采购退货单'}</h3><p>从已入库单登记采购退货，或调整筛选条件。</p></div>}
      <footer className={s.tableFooter}><span>草稿不占库存及来源额度；按实际交接退回；退款和应付后续扩展。</span><span>本地单用户</span></footer>
    </section>
    {overlay && <Dialog key={`${overlay.type}-${overlay.id ?? ''}`} wide busy={busy} onClose={close} title={overlay.type === 'new' ? '新建采购退货单' : overlay.type === 'edit' ? '编辑采购退货草稿' : overlay.type === 'confirm' ? '确认采购采购退货出库' : overlay.type === 'cancel' ? '取消退货草稿' : '采购退货详情'}>
      {(overlay.type === 'new' || overlay.type === 'edit') && <PurchaseReturnEditor data={data} doc={overlay.type === 'edit' ? current : undefined} initialReceiptId={initialReceiptId} busy={busy} onDirty={setDirty} onClose={close} onSave={async input => { const next = await onMutate({ type: 'save-purchase-return', ...input }); setOverlay({ type: 'detail', id: input.purchaseReturnId ?? next.purchaseReturns.at(-1)!.id }); setNotice('退货草稿已保存，库存未变。实物核对并交接时再确认出库。'); }} />}
      {doc && !['new', 'edit'].includes(overlay.type) && <div className={s.detail}>
        <div className={s.orderHero}><div><span className={s.detailOverline}>主仓库 · 采购退货</span><h3>{doc.number}</h3></div><span className={`${s.status} ${badge[doc.status]}`}>{purchaseReturnLabels[doc.status]}</span></div>
        <div className={s.detailFacts}><div>供应商<strong>{doc.supplierName}</strong></div><div>实际退货日期<strong>{doc.returnDate || '待交接填写'}</strong></div><div>原入库单<strong>{data.receipts.find(o => o.id === doc.receiptId)?.number}</strong></div><div>原送货单<strong>{doc.deliveryNumber}</strong></div><div>创建时间<strong>{time(doc.createdAt)}</strong></div><div>确认时间<strong>{doc.confirmedAt ? time(doc.confirmedAt) : '尚未出库'}</strong></div></div>
        <div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>原单商品</th><th>原实收</th><th>当前累计已退</th><th>当前剩余可退</th><th>本次数量</th><th>退货原因</th></tr></thead><tbody>{doc.lines.map(l => { const q = purchaseReturnQuantities(data, doc.receiptId, l.productId); return <tr key={l.productId}><td><strong>{l.productName}</strong><small>{l.sku} · {l.unit}{data.products.find(p => p.id === l.productId)?.active === false ? ' · 已停用' : ''}</small>{doc.status === 'returned' && <button type="button" className={s.textButton} onClick={() => onStock(l.productId)}>查看库存</button>}</td><td>{q.received}</td><td>{q.returned}</td><td>{q.remaining}<small>当前库存 {data.products.find(p => p.id === l.productId)?.stock ?? 0}</small></td><td>{l.quantity} {l.unit}</td><td className={s.returnReason}>{l.reason}</td></tr>; })}</tbody></table></div>
        {doc.note && <div className={s.note}><span>退货备注</span><p>{doc.note}</p></div>}
        {doc.cancelReason && <p className={s.warning}>取消原因：{doc.cancelReason}</p>}
        {doc.status === 'draft' && (sourceInvalid || stockShort || overLimit) && <p className={s.warning} role="alert">{sourceInvalid ? '原入库单已冲销或来源失效，本草稿不能出库，请核查或取消。' : overLimit ? '来源最新可退额度不足，请编辑草稿重新核对。' : '当前库存不足，草稿可保留，交接出库前须重新核对。'}</p>}
        {revisionChanged && <p className={s.warning} role="alert">本单已在其他页面更新，请返回详情重新核对。</p>}
        {(overlay.type === 'confirm' || overlay.type === 'cancel') && <PurchaseReturnOperation key={`${overlay.type}-${doc.id}-${current?.revision}-${duplicatePurchaseReturns(data, doc).map(r => r.id).join(',')}`} doc={doc} data={data} busy={busy} cancelling={overlay.type === 'cancel'} stale={revisionChanged || (overlay.type === 'confirm' && (sourceInvalid || stockShort || overLimit))} onSubmit={async (reason, handedOver, allowDuplicate) => {
          try { await onMutate(overlay.type === 'cancel' ? { type: 'cancel-purchase-return', purchaseReturnId: doc.id, revision: doc.revision, reason } : { type: 'confirm-purchase-return', purchaseReturnId: doc.id, revision: doc.revision, handedOver, allowDuplicate }); }
          catch (error) { await onReload().catch(() => undefined); throw error; }
          setOverlay({ type: 'detail', id: doc.id }); setNotice(overlay.type === 'cancel' ? '退货草稿已取消，库存未变。' : '采购退货已交接出库，库存与流水已更新。');
        }} />}
        <h4 className={s.historyTitle}>操作记录</h4><ol className={s.history}>{doc.history.toReversed().map((event, index) => <li key={`${event.at}-${index}`}><span className={s.historyDot} /><div>{event.action}<small>{event.actor} · {time(event.at)}</small></div></li>)}</ol>
        <footer className={s.dialogFoot}><span className={s.helper}>{doc.status === 'returned' ? '出库结果只读；本期暂不支持采购退货冲销及更正。' : '交接前核对实物和数量，退款及供应商签收后续处理。'}</span><div className={s.actions}>
          <button type="button" className={s.secondary} disabled={busy} onClick={() => onReceipt(doc.receiptId)}>查看原入库单</button><button type="button" className={s.secondary} disabled={busy} onClick={() => { setOverlay(null); setFilters({ ...defaultFilters, supplier: doc.supplierId }); }}>查看该供应商退货</button>
          {doc.status === 'draft' && overlay.type === 'detail' && <><button type="button" className={s.secondary} disabled={busy} onClick={() => open('edit', doc.id)}>编辑草稿</button><button type="button" className={s.dangerButton} disabled={busy} onClick={() => open('cancel', doc.id)}>取消采购退货单</button><button type="button" className={s.primary} disabled={busy || sourceInvalid || stockShort || overLimit} onClick={() => open('confirm', doc.id)}>确认采购退货出库</button></>}
          {doc.status === 'returned' && <button type="button" className={s.secondary} onClick={() => onLedger(doc.id)}>查看本单流水</button>}
          {(overlay.type === 'confirm' || overlay.type === 'cancel') && <button type="button" className={s.secondary} disabled={busy} onClick={() => open('detail', doc.id)}>返回详情</button>}
        </div></footer>
      </div>}
    </Dialog>}
  </>;
}

function PurchaseReturnOperation({ doc, data, busy, cancelling, stale, onSubmit }: { doc: PurchaseReturn; data: Workspace; busy: boolean; cancelling: boolean; stale: boolean; onSubmit: (reason: string, handedOver: boolean, allowDuplicate: boolean) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [handedOver, setHandedOver] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [error, setError] = useState('');
  const duplicates = duplicatePurchaseReturns(data, doc);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); try { await onSubmit(reason, handedOver, allowDuplicate); } catch (error) { setError(error instanceof Error ? error.message : '操作失败'); } }
  return <form className={s.receiptOperation} onSubmit={submit}>
    <p className={s.helper}>{cancelling ? '取消草稿不改变库存，原单及原因保留。' : '请核对以上商品和本次数量。确认后整单扣减库存，单据只读；本次应已与供应商协商，核对实物及来源；不记录退款。'}</p>
    {error && <p className={s.error} role="alert">{error}</p>}
    {!cancelling && !doc.returnDate && <p className={s.warning}>尚未填写实际退货日期，请返回详情编辑草稿后再确认。</p>}
    <fieldset className={s.fieldset} disabled={busy || stale}>
      {cancelling ? <label className={s.field}>取消原因 <span>*</span><textarea required maxLength={300} rows={2} aria-label="取消采购退货原因" value={reason} onChange={e => setReason(e.target.value)} /></label> : <>
        {duplicates.length > 0 && <div className={s.warning}><p>发现疑似重复退货：{duplicates.map(r => r.number).join('、')}。同一原单、实际退货日期和商品数量已有出库记录，请先核对。</p><label className={s.duplicateCheck}><input type="checkbox" aria-label="已核对疑似重复退货" checked={allowDuplicate} onChange={e => setAllowDuplicate(e.target.checked)} />我已核对，确认这是另一次实际交接，继续本次出库。</label></div>}
        <label className={s.duplicateCheck}><input type="checkbox" aria-label="确认采购退货已交接出库" checked={handedOver} onChange={e => setHandedOver(e.target.checked)} />供应商已同意本次退货，我已核对上述实物与数量，并确认货物已交接出库。</label>
      </>}
      <button type="submit" className={cancelling ? s.dangerSolid : s.primary} disabled={busy || stale || (!cancelling && (!handedOver || !doc.returnDate || (duplicates.length > 0 && !allowDuplicate)))}>{busy ? '处理中…' : cancelling ? '确认取消采购退货单' : '确认交接并退货出库'}</button>
    </fieldset>
  </form>;
}
