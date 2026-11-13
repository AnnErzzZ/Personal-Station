'use client';

import { useState, type FormEvent } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { day, money, priceCents, type DraftInput, type Order, type Workspace } from './model';
import s from './erp.module.css';

type Line = { key: number; productId: string; quantity: string; price: string };
export default function OrderEditor({ data, order, busy, onSave, onClose }: { data: Workspace; order?: Order; busy: boolean; onSave: (input: DraftInput) => Promise<void>; onClose: () => void }) {
  const [customerId, setCustomerId] = useState(order?.customerId ?? '');
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? day());
  const [note, setNote] = useState(order?.note ?? '');
  const [lines, setLines] = useState<Line[]>(order?.lines.map((line, key) => ({ key, productId: line.productId, quantity: String(line.quantity), price: (line.unitPriceCents / 100).toFixed(2) })) ?? [{ key: 0, productId: '', quantity: '1', price: '' }]);
  const [error, setError] = useState('');
  const patchLine = (key: number, patch: Partial<Line>) => setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line));
  const lineTotal = (line: Line) => { try { const count = Number(line.quantity); return Number.isFinite(count) ? count * priceCents(line.price) : 0; } catch { return 0; } };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try { await onSave({ orderId: order?.id, customerId, deliveryDate, note, lines: lines.map(line => ({ productId: line.productId, quantity: Number(line.quantity), price: line.price })) }); }
    catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
  }
  return <form onSubmit={save} className={s.editor}>
    <p className={s.helper}>先保存草稿，核对后提交给仓库。保存与提交均不扣减库存。</p>
    {error && <div className={s.error} role="alert">{error}</div>}
    <fieldset disabled={busy} className={s.fieldset}>
      <div className={s.formGrid}>
        <label className={s.field}>客户 <span>*</span><select required value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">请选择客户</option>{data.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label className={s.field}>期望发货日期 <span>*</span><input required type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></label>
      </div>
      <div className={s.sectionLabel}><h3>商品明细</h3><span>数量按整数录入 · 人民币</span></div>
      <div className={s.tableScroll}><table className={s.editTable}><thead><tr><th>商品</th><th>当前库存</th><th>数量</th><th>单价</th><th>金额</th><th><span className={s.srOnly}>移除</span></th></tr></thead><tbody>{lines.map((line, index) => {
        const product = data.products.find(p => p.id === line.productId);
        return <tr key={line.key}>
          <td><select required aria-label={`第${index + 1}行商品`} value={line.productId} onChange={e => { const selected = data.products.find(p => p.id === e.target.value); patchLine(line.key, { productId: e.target.value, price: selected ? (selected.priceCents / 100).toFixed(2) : '' }); }}><option value="">选择商品</option>{data.products.filter(p => p.id === line.productId || (p.active !== false && !lines.some(l => l.productId === p.id))).map(p => <option value={p.id} key={p.id} disabled={p.active === false}>{p.name}{p.active === false ? '（已停用）' : ''}</option>)}</select>{product && <small>{product.sku} · {product.unit}</small>}</td>
          <td><span className={product && Number(line.quantity) > product.stock ? s.dangerText : ''}>{product ? product.initialized ? product.stock : '未初始化' : '—'}</span></td>
          <td><input aria-label={`第${index + 1}行数量`} type="number" min="1" max="1000000" step="1" required value={line.quantity} onChange={e => patchLine(line.key, { quantity: e.target.value })} /></td>
          <td><input aria-label={`第${index + 1}行单价`} type="number" min="0" max="9999999.99" step="0.01" required value={line.price} onChange={e => patchLine(line.key, { price: e.target.value })} /></td>
          <td className={s.numeric}>{money(lineTotal(line))}</td>
          <td><button type="button" className={s.iconButton} aria-label={`移除第${index + 1}行`} disabled={lines.length === 1} onClick={() => setLines(current => current.filter(l => l.key !== line.key))}><IconTrash size={17} /></button></td>
        </tr>;
      })}</tbody></table></div>
      <button type="button" className={s.textButton} disabled={!data.products.some(p => p.active !== false && !lines.some(l => l.productId === p.id)) || lines.length >= 100} onClick={() => setLines(current => [...current, { key: Math.max(...current.map(l => l.key)) + 1, productId: '', quantity: '1', price: '' }])}><IconPlus size={16} />添加商品</button>
      {lines.some(line => { const product = data.products.find(p => p.id === line.productId); return product && Number(line.quantity) > product.stock; }) && <p className={s.warning}>部分商品库存不足，可以保存与提交订单，但库存充足后才能整单出库。</p>}
      {lines.some(line => data.products.find(p => p.id === line.productId)?.active === false) && <p className={s.warning}>草稿含已停用商品，请移除或替换；也可以重新启用商品后继续。</p>}
      <label className={s.field}>订单备注<textarea maxLength={1000} rows={3} placeholder="例如：收货地址、交接注意事项" value={note} onChange={e => setNote(e.target.value)} /></label>
    </fieldset>
    <footer className={s.dialogFoot}><span className={s.total}>订单金额 <strong>{money(lines.reduce((sum, line) => sum + lineTotal(line), 0))}</strong></span><div className={s.actions}><button className={s.secondary} type="button" disabled={busy} onClick={onClose}>取消</button><button className={s.primary} type="submit" disabled={busy}>{busy ? '保存中…' : '保存草稿'}</button></div></footer>
  </form>;
}
