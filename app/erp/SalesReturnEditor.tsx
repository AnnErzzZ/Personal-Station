'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { day, salesReturnQuantities, type SalesReturn, type SalesReturnInput, type Workspace } from './model';
import s from './erp.module.css';

type Line = { key: number; productId: string; quantity: string; reason: string };
const emptyLine = (key = 0): Line => ({ key, productId: '', quantity: '', reason: '' });
export default function SalesReturnEditor({ data, doc, initialOrderId, busy, onSave, onClose, onDirty }: {
  data: Workspace; doc?: SalesReturn; initialOrderId?: string; busy: boolean;
  onSave: (input: SalesReturnInput) => Promise<void>; onClose: () => void; onDirty: (dirty: boolean) => void;
}) {
  const [revision] = useState(doc?.revision);
  const [orderId, setOrderId] = useState(doc?.orderId ?? initialOrderId ?? '');
  const [search, setSearch] = useState('');
  const [receiptDate, setReceiptDate] = useState(doc?.receiptDate ?? '');
  const [note, setNote] = useState(doc?.note ?? '');
  const [lines, setLines] = useState<Line[]>(doc?.lines.map((l, key) => ({ key, productId: l.productId, quantity: String(l.quantity), reason: l.reason })) ?? [emptyLine()]);
  const [error, setError] = useState('');
  const serialized = JSON.stringify({ orderId, receiptDate, note, lines });
  const [initial] = useState(serialized);
  useEffect(() => { onDirty(serialized !== initial); }, [serialized, initial, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const changed = Boolean(doc && (doc.revision !== revision || doc.status !== 'draft'));
  const order = data.orders.find(o => o.id === orderId);
  const term = search.trim().toLowerCase();
  const options = data.orders.filter(o => o.id === orderId || (o.status === 'shipped' && o.lines.some(l => salesReturnQuantities(data, o.id, l.productId).remaining > 0) && `${o.number} ${o.shipmentNumber} ${data.customers.find(c => c.id === o.customerId)?.name}`.toLowerCase().includes(term)));
  const patch = (key: number, fields: Partial<Line>) => setLines(current => current.map(l => l.key === key ? { ...l, ...fields } : l));
  function chooseOrder(id: string) {
    if (id === orderId) return;
    if (lines.some(l => l.productId || l.quantity || l.reason) && !window.confirm('更换原订单会清空当前商品明细，确定继续吗？')) return;
    setOrderId(id); setLines([emptyLine()]); setError('');
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (lines.some(l => !l.quantity.trim())) { setError('请填写每行本次退货数量'); return; }
    try { await onSave({ salesReturnId: doc?.id, revision, orderId, receiptDate, note, lines: lines.map(l => ({ productId: l.productId, quantity: Number(l.quantity), reason: l.reason })) }); }
    catch (error) { setError(error instanceof Error ? error.message : '退货草稿保存失败'); }
  }
  return <form className={s.editor} onSubmit={save}>
    <p className={s.helper}>关联原已出库订单，登记拟退商品。收到实物后按实际验收合格数量修正并确认入库。草稿不改库存，也不预占可退数量。</p>
    <p className={s.warning}>本期仅接收合格商品。坏品请另行隔离跟进；退款、换货及平台自动同步后续扩展。</p>
    {error && <p className={s.error} role="alert">{error}</p>}
    {changed && <p className={s.warning} role="alert">这张草稿已被其他页面更新，请关闭并重新打开核对。当前输入尚未保存。</p>}
    <fieldset className={s.fieldset} disabled={busy || changed}>
      {!doc && <label className={s.field}>查找原订单<input aria-label="查找退货原订单" value={search} placeholder="订单号、出库单号或客户" onChange={e => setSearch(e.target.value)} /></label>}
      <div className={s.formGrid}>
        <label className={s.field}>原销售订单 <span>*</span><select required aria-label="退货原销售订单" disabled={Boolean(doc)} value={orderId} onChange={e => chooseOrder(e.target.value)}><option value="">请选择已出库订单</option>{options.map(o => <option key={o.id} value={o.id}>{o.number} · {data.customers.find(c => c.id === o.customerId)?.name}</option>)}</select></label>
        <label className={s.field}>实收日期<input type="date" aria-label="退货实收日期" max={day()} value={receiptDate} onChange={e => setReceiptDate(e.target.value)} /><small>草稿可空；收到实物后填写，确认时必填。</small></label>
      </div>
      {order && <p className={s.helper}>原出库单：{order.shipmentNumber} · 主仓库 · {doc?.customerName ?? data.customers.find(c => c.id === order.customerId)?.name}</p>}
      {!options.length && <p className={s.warning}>没有符合条件的已出库订单，请先完成销售出库，或调整搜索条件。</p>}
      <div className={s.sectionLabel}><h3>退货商品明细</h3><span>确认前按本次实际合格数量核对</span></div>
      <div className={s.tableScroll}><table className={`${s.editTable} ${s.returnEditTable}`}><thead><tr><th>原单商品</th><th>当前可退情况</th><th>本次退货数量</th><th>退货原因</th><th>操作</th></tr></thead><tbody>{lines.map((line, index) => {
        const source = order?.lines.find(l => l.productId === line.productId);
        const product = data.products.find(p => p.id === line.productId);
        const q = salesReturnQuantities(data, orderId, line.productId);
        const unit = source?.unit ?? product?.unit ?? '';
        return <tr key={line.key}>
          <td data-label="原单商品"><select required aria-label={`退货第${index + 1}行商品`} disabled={!order} value={line.productId} onChange={e => patch(line.key, { productId: e.target.value, quantity: '', reason: '' })}><option value="">请选择原单商品</option>{order?.lines.filter(l => l.productId === line.productId || (!lines.some(x => x.productId === l.productId) && salesReturnQuantities(data, orderId, l.productId).remaining > 0)).map(l => { const p = data.products.find(p => p.id === l.productId); return <option key={l.productId} value={l.productId}>{l.productName ?? p?.name}{p?.active === false ? '（已停用）' : ''}</option>; })}</select>{source && <small>{source.sku ?? product?.sku} · {unit}</small>}</td>
          <td data-label="当前可退情况">{source ? <><strong>可退 {q.remaining} {unit}</strong><small>原出库 {q.shipped} · 已退 {q.returned}</small></> : '—'}</td>
          <td data-label="本次退货数量"><input required type="number" min="1" max={Math.max(0, Math.min(q.remaining, 1000000))} step="1" disabled={!source} aria-label={`退货第${index + 1}行数量`} value={line.quantity} placeholder="填写数量" onChange={e => patch(line.key, { quantity: e.target.value })} />{source && Number(line.quantity) > q.remaining && <small className={s.dangerText}>超过最新可退数量，请重新核对。</small>}</td>
          <td data-label="退货原因"><input required maxLength={300} aria-label={`退货第${index + 1}行原因`} value={line.reason} placeholder="填写退货及收货差异原因" onChange={e => patch(line.key, { reason: e.target.value })} /></td>
          <td data-label="操作"><button type="button" className={s.iconButton} disabled={lines.length === 1} aria-label={`移除退货第${index + 1}行`} onClick={() => setLines(current => current.filter(l => l.key !== line.key))}><IconTrash size={17} /></button></td>
        </tr>;
      })}</tbody></table></div>
      <button type="button" className={s.textButton} disabled={!order || lines.length >= 100 || !order.lines.some(l => !lines.some(x => x.productId === l.productId) && salesReturnQuantities(data, orderId, l.productId).remaining > 0)} onClick={() => setLines(current => [...current, emptyLine(Math.max(...current.map(l => l.key)) + 1)])}><IconPlus size={16} />添加退货商品</button>
      <label className={s.field}>退货备注<textarea aria-label="退货备注" maxLength={1000} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="选填，记录本次退货和收货情况" /></label>
    </fieldset>
    <footer className={s.dialogFoot}><span className={s.helper}>本单一次确认，未收到或不合格的商品请移除。</span><div className={s.actions}><button type="button" className={s.secondary} disabled={busy} onClick={onClose}>取消</button><button type="submit" className={s.primary} disabled={busy || changed}>{busy ? '保存中…' : '保存退货草稿'}</button></div></footer>
  </form>;
}
