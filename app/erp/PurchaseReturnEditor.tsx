'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { day, purchaseReturnQuantities, type PurchaseReturn, type PurchaseReturnInput, type Workspace } from './model';
import s from './erp.module.css';

type Line = { key: number; productId: string; quantity: string; reason: string };
const emptyLine = (key = 0): Line => ({ key, productId: '', quantity: '', reason: '' });
export default function PurchaseReturnEditor({ data, doc, initialReceiptId, busy, onSave, onClose, onDirty }: {
  data: Workspace; doc?: PurchaseReturn; initialReceiptId?: string; busy: boolean;
  onSave: (input: PurchaseReturnInput) => Promise<void>; onClose: () => void; onDirty: (dirty: boolean) => void;
}) {
  const [revision] = useState(doc?.revision);
  const [receiptId, setReceiptId] = useState(doc?.receiptId ?? initialReceiptId ?? '');
  const [search, setSearch] = useState('');
  const [returnDate, setReturnDate] = useState(doc?.returnDate ?? '');
  const [note, setNote] = useState(doc?.note ?? '');
  const [lines, setLines] = useState<Line[]>(doc?.lines.map((l, key) => ({ key, productId: l.productId, quantity: String(l.quantity), reason: l.reason })) ?? [emptyLine()]);
  const [error, setError] = useState('');
  const serialized = JSON.stringify({ receiptId, returnDate, note, lines });
  const [initial] = useState(serialized);
  useEffect(() => { onDirty(serialized !== initial); }, [serialized, initial, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const changed = Boolean(doc && (doc.revision !== revision || doc.status !== 'draft'));
  const receipt = data.receipts.find(o => o.id === receiptId);
  const term = search.trim().toLowerCase();
  const options = data.receipts.filter(o => o.id === receiptId || (o.status === 'received' && o.lines.some(l => purchaseReturnQuantities(data, o.id, l.productId).remaining > 0) && `${o.number} ${o.deliveryNumber} ${o.supplierName ?? ''} ${data.suppliers.find(c => c.id === o.supplierId)?.name}`.toLowerCase().includes(term)));
  const patch = (key: number, fields: Partial<Line>) => setLines(current => current.map(l => l.key === key ? { ...l, ...fields } : l));
  function chooseReceipt(id: string) {
    if (id === receiptId) return;
    if (lines.some(l => l.productId || l.quantity || l.reason) && !window.confirm('更换原入库单会清空当前商品明细，确定继续吗？')) return;
    setReceiptId(id); setLines([emptyLine()]); setError('');
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (lines.some(l => !l.quantity.trim())) { setError('请填写每行本次退货数量'); return; }
    try { await onSave({ purchaseReturnId: doc?.id, revision, receiptId, returnDate, note, lines: lines.map(l => ({ productId: l.productId, quantity: Number(l.quantity), reason: l.reason })) }); }
    catch (error) { setError(error instanceof Error ? error.message : '采购退货草稿保存失败'); }
  }
  return <form className={s.editor} onSubmit={save}>
    <p className={s.helper}>关联原已入库单，登记拟退商品。交接前按本次实物数量核对，确认退货出库才扣减库存。草稿不占用来源额度或库存。</p>
    <p className={s.warning}>退回已入账的商品，请先与原供应商协商并核对实物。退款、应付调整和质量库存后续扩展；未入库拒收不走本流程。</p>
    {error && <p className={s.error} role="alert">{error}</p>}
    {changed && <p className={s.warning} role="alert">这张草稿已被其他页面更新，请关闭并重新打开核对。当前输入尚未保存。</p>}
    <fieldset className={s.fieldset} disabled={busy || changed}>
      {!doc && <label className={s.field}>查找原入库单<input aria-label="查找采购退货原入库单" value={search} placeholder="入库单号、送货单号或供应商" onChange={e => setSearch(e.target.value)} /></label>}
      <div className={s.formGrid}>
        <label className={s.field}>原采购入库单 <span>*</span><select required aria-label="采购退货原入库单" disabled={Boolean(doc)} value={receiptId} onChange={e => chooseReceipt(e.target.value)}><option value="">请选择已入库单</option>{options.map(o => <option key={o.id} value={o.id}>{o.number} · {o.supplierName ?? data.suppliers.find(c => c.id === o.supplierId)?.name}</option>)}</select></label>
        <label className={s.field}>实际退货日期<input type="date" aria-label="采购退货实际日期" min={receipt?.receiptDate} max={day()} value={returnDate} onChange={e => setReturnDate(e.target.value)} /><small>草稿可空；交接时必填，不早于原收货日期。</small></label>
      </div>
      {receipt && <p className={s.helper}>原送货单：{receipt.deliveryNumber || '未填写'} · 主仓库 · {doc?.supplierName ?? receipt.supplierName ?? data.suppliers.find(c => c.id === receipt.supplierId)?.name}</p>}
      {!options.length && <p className={s.warning}>没有符合条件的已入库单，请先完成采购入库，或调整搜索条件。</p>}
      <div className={s.sectionLabel}><h3>退货商品明细</h3><span>交接前核对来源额度与当前库存</span></div>
      <div className={s.tableScroll}><table className={`${s.editTable} ${s.returnEditTable}`}><thead><tr><th>原入库商品</th><th>当前可退情况</th><th>本次退货数量</th><th>退货原因</th><th>操作</th></tr></thead><tbody>{lines.map((line, index) => {
        const source = receipt?.lines.find(l => l.productId === line.productId);
        const product = data.products.find(p => p.id === line.productId);
        const q = purchaseReturnQuantities(data, receiptId, line.productId);
        const unit = source?.unit ?? product?.unit ?? '';
        return <tr key={line.key}>
          <td data-label="原入库商品"><select required aria-label={`采购退货第${index + 1}行商品`} disabled={!receipt} value={line.productId} onChange={e => patch(line.key, { productId: e.target.value, quantity: '', reason: '' })}><option value="">请选择原入库商品</option>{receipt?.lines.filter(l => l.productId === line.productId || (!lines.some(x => x.productId === l.productId) && purchaseReturnQuantities(data, receiptId, l.productId).remaining > 0)).map(l => { const p = data.products.find(p => p.id === l.productId); return <option key={l.productId} value={l.productId}>{l.productName ?? p?.name}{p?.active === false ? '（已停用）' : ''}</option>; })}</select>{source && <small>{source.sku ?? product?.sku} · {unit}</small>}</td>
          <td data-label="当前可退情况">{source ? <><strong>来源可退 {q.remaining} {unit}</strong><small>原实收 {q.received} · 已退 {q.returned}</small><small>当前库存 {product?.stock ?? 0} · 最多可出库 {Math.min(q.remaining, product?.stock ?? 0)}</small></> : '—'}</td>
          <td data-label="本次退货数量"><input required type="number" min="1" max={Math.max(0, Math.min(q.remaining, 1000000))} step="1" disabled={!source} aria-label={`采购退货第${index + 1}行数量`} value={line.quantity} placeholder="填写数量" onChange={e => patch(line.key, { quantity: e.target.value })} />{source && Number(line.quantity) > q.remaining && <small className={s.dangerText}>超过来源可退额度，请重新核对。</small>}{source && Number(line.quantity) > (product?.stock ?? 0) && <small className={s.dangerText}>当前库存不足，可保存草稿；确认前须重新核对。</small>}</td>
          <td data-label="退货原因"><input required maxLength={300} aria-label={`采购退货第${index + 1}行原因`} value={line.reason} placeholder="填写实际退回原因和交接差异" onChange={e => patch(line.key, { reason: e.target.value })} /></td>
          <td data-label="操作"><button type="button" className={s.iconButton} disabled={lines.length === 1} aria-label={`移除采购退货第${index + 1}行`} onClick={() => setLines(current => current.filter(l => l.key !== line.key))}><IconTrash size={17} /></button></td>
        </tr>;
      })}</tbody></table></div>
      <button type="button" className={s.textButton} disabled={!receipt || lines.length >= 100 || !receipt.lines.some(l => !lines.some(x => x.productId === l.productId) && purchaseReturnQuantities(data, receiptId, l.productId).remaining > 0)} onClick={() => setLines(current => [...current, emptyLine(Math.max(...current.map(l => l.key)) + 1)])}><IconPlus size={16} />添加采购退货商品</button>
      <label className={s.field}>采购退货备注<textarea aria-label="采购退货备注" maxLength={1000} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="选填，记录本次退货和交接情况" /></label>
    </fieldset>
    <footer className={s.dialogFoot}><span className={s.helper}>本单一次出库，未交接的商品请移除，余下以后另建单。</span><div className={s.actions}><button type="button" className={s.secondary} disabled={busy} onClick={onClose}>取消</button><button type="submit" className={s.primary} disabled={busy || changed}>{busy ? '保存中…' : '保存采购退货草稿'}</button></div></footer>
  </form>;
}
