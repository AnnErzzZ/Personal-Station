'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { day, money, priceCents, preferredSupplierId, type Command, type Receipt, type ReceiptInput, type Workspace } from './model';
import s from './erp.module.css';

type Line = { key: number; productId: string; quantity: string; price: string };
export default function PurchaseEditor({ data, receipt, corrects, initialProduct, busy, onSave, onClose, onMutate, onDirty }: {
  data: Workspace; receipt?: Receipt; corrects?: Receipt; initialProduct?: string; busy: boolean; onSave: (input: ReceiptInput) => Promise<void>; onClose: () => void; onMutate: (command: Command) => Promise<Workspace>; onDirty: (dirty: boolean) => void;
}) {
  const source = receipt ?? corrects;
  const [supplierId, setSupplierId] = useState(source?.supplierId ?? preferredSupplierId(data, data.products.find(p => p.id === initialProduct)) ?? '');
  const [receiptDate, setDate] = useState(receipt?.receiptDate ?? day());
  const [deliveryNumber, setDelivery] = useState(source?.deliveryNumber ?? '');
  const [note, setNote] = useState(source?.note ?? '');
  const [lines, setLines] = useState<Line[]>(source?.lines.map((l, key) => ({ key, productId: l.productId, quantity: String(l.quantity), price: (l.unitPriceCents / 100).toFixed(2) })) ?? [{ key: 0, productId: initialProduct ?? '', quantity: '1', price: '' }]);
  const [error, setError] = useState('');
  const [quick, setQuick] = useState<'supplier' | 'product' | null>(null);
  const [quickFields, setQuickFields] = useState<Record<string, string>>({});
  const serialized = JSON.stringify({ supplierId, receiptDate, deliveryNumber, note, lines });
  const [initial] = useState(serialized);
  const dirty = serialized !== initial || Object.values(quickFields).some(Boolean) || Boolean(corrects);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const patch = (key: number, value: Partial<Line>) => setLines(current => current.map(l => l.key === key ? { ...l, ...value } : l));
  function chooseProduct(key: number, productId: string) {
    patch(key, { productId });
    if (!supplierId) { const preferred = preferredSupplierId(data, data.products.find(p => p.id === productId)); if (preferred) setSupplierId(preferred); }
  }
  const temporaryProducts = supplierId ? lines.flatMap(line => { const product = data.products.find(p => p.id === line.productId); return product && !product.supplierIds?.includes(supplierId) ? [product] : []; }) : [];
  const total = (l: Line) => { try { return Number(l.quantity) * priceCents(l.price); } catch { return 0; } };
  const duplicate = deliveryNumber.trim() && data.receipts.find(r => r.id !== receipt?.id && r.status === 'received' && r.supplierId === supplierId && r.deliveryNumber === deliveryNumber.trim());
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try { await onSave({ receiptId: receipt?.id, correctsId: receipt?.correctsId ?? corrects?.id, supplierId, receiptDate, deliveryNumber, note, lines: lines.map(l => ({ productId: l.productId, quantity: Number(l.quantity), price: l.price })) }); }
    catch (error) { setError(error instanceof Error ? error.message : '草稿保存失败'); }
  }
  async function createQuick() {
    setError('');
    try {
      const next = await onMutate(quick === 'supplier' ? { type: 'add-supplier', name: quickFields.name ?? '', contact: quickFields.contact, phone: quickFields.phone } : { type: 'add-product', name: quickFields.name ?? '', sku: quickFields.sku ?? '', unit: quickFields.unit ?? '', price: quickFields.price || '0' });
      if (quick === 'supplier') setSupplierId(next.suppliers.at(-1)!.id);
      else { const productId = next.products.at(-1)!.id; setLines(current => { const blank = current.find(l => !l.productId); return blank ? current.map(l => l.key === blank.key ? { ...l, productId } : l) : [...current, { key: Math.max(...current.map(l => l.key)) + 1, productId, quantity: '1', price: '' }]; }); }
      setQuick(null); setQuickFields({});
    } catch (error) { setError(error instanceof Error ? error.message : '新增资料失败'); }
  }
  return <form className={s.editor} onSubmit={save}>
    <p className={s.helper}>按本批实际收到的数量录入。保存草稿后核对实物，确认入库才增加库存。主仓库 · 人民币。</p>
    {corrects && <p className={s.warning}>更正来源：{corrects.number}。核对正确资料后保存为一张新的入库单。</p>}
    {error && <div className={s.error} role="alert">{error}</div>}
    <fieldset className={s.fieldset} disabled={busy}>
      <div className={s.formGrid}>
        <label className={s.field}>供应商 <span>*</span><select required aria-label="入库供应商" value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">请选择供应商</option>{data.suppliers.filter(s => s.active !== false || s.id === supplierId).map(s => <option key={s.id} value={s.id} disabled={s.active === false}>{s.name}{s.active === false ? '（已停用）' : ''}</option>)}</select></label>
        <label className={s.field}>收货日期 <span>*</span><input required aria-label="收货日期" type="date" max={day()} value={receiptDate} onChange={e => setDate(e.target.value)} /></label>
        <label className={s.field}>供应商送货单号<input aria-label="供应商送货单号" maxLength={80} value={deliveryNumber} onChange={e => setDelivery(e.target.value)} placeholder="选填，用于核对重复收货" /></label>
        <label className={s.field}>入库仓库<input value="主仓库" readOnly /></label>
      </div>
      <div className={s.quickActions}><button type="button" className={s.textButton} onClick={() => { setQuick('supplier'); setQuickFields({}); }}>新增供应商</button><button type="button" className={s.textButton} disabled={lines.length >= 100} onClick={() => { setQuick('product'); setQuickFields({}); }}>新增商品资料</button></div>
      {quick && <div className={s.inlineCreate}>
        <div className={s.sectionLabel}><h3>{quick === 'supplier' ? '新增供应商' : '新增商品资料'}</h3><span>本单已填内容会保留</span></div>
        <div className={s.formGrid}>{(quick === 'supplier' ? [['name', '供应商名称'], ['contact', '联系人（选填）'], ['phone', '电话（选填）']] : [['name', '商品名称'], ['sku', '商品编码'], ['unit', '销售单位'], ['price', '参考售价（选填）']]).map(([key, label]) => <label className={s.field} key={key}>{label}<input aria-label={`快捷${label}`} maxLength={key === 'name' ? 80 : key === 'unit' ? 8 : key === 'contact' ? 50 : 40} type={key === 'price' ? 'number' : 'text'} min={key === 'price' ? '0' : undefined} step={key === 'price' ? '0.01' : undefined} value={quickFields[key] ?? ''} onChange={e => setQuickFields(current => ({ ...current, [key]: e.target.value }))} /></label>)}</div>
        <div className={s.actions}><button type="button" className={s.secondary} onClick={() => { setQuick(null); setQuickFields({}); }}>收起新增资料</button><button type="button" className={s.primary} onClick={() => { void createQuick(); }}>保存资料并带入</button></div>
      </div>}
      <div className={s.sectionLabel}><h3>实收商品明细</h3><span>采购单价单独填写，数量按整数录入</span></div>
      {supplierId && <p className={s.helper}>商品列表优先显示该供应商的关联商品。其他商品可按临时采购录入，实际供货以本单所选供应商为准。</p>}
      {temporaryProducts.length > 0 && <p className={s.warning} role="status">临时采购：{temporaryProducts.map(p => p.name).join('、')}尚未关联当前供应商。请核对供货方和本次单价，保存与入库均保持商品原有供货关联。</p>}
      {data.products.some(p => !p.initialized) && <p className={s.helper}>旧商品中仍有待初始化资料，请先在库存查询的“期初设置”中录入期初或确认零库存启用。</p>}
      <div className={s.tableScroll}><table className={s.editTable}><thead><tr><th>商品</th><th>当前库存</th><th>实收数量</th><th>采购单价</th><th>金额</th><th>操作</th></tr></thead><tbody>{lines.map((line, index) => { const product = data.products.find(p => p.id === line.productId); return <tr key={line.key}>
        <td><select required aria-label={`入库第${index + 1}行商品`} value={line.productId} onChange={e => chooseProduct(line.key, e.target.value)}><option value="">选择商品</option>{(supplierId ? [true, false] : [false]).map(linked => {
          const eligible = data.products.filter(p => (p.id === line.productId || (p.active !== false && p.initialized && !lines.some(l => l.productId === p.id))) && (!supplierId || Boolean(p.supplierIds?.includes(supplierId)) === linked));
          return eligible.length ? <optgroup key={String(linked)} label={!supplierId ? '全部可选商品' : linked ? '该供应商关联商品' : '其他商品（临时采购）'}>{eligible.map(p => <option value={p.id} key={p.id} disabled={p.active === false || !p.initialized}>{p.name}{p.active === false ? '（已停用）' : !p.initialized ? '（待初始化）' : ''}</option>)}</optgroup> : null;
        })}</select>{product && <small>{product.sku} · {product.unit}</small>}</td>
        <td>{product ? product.initialized ? product.stock : '待初始化' : '—'}</td>
        <td><input aria-label={`入库第${index + 1}行数量`} required type="number" min="1" max="1000000" step="1" value={line.quantity} onChange={e => patch(line.key, { quantity: e.target.value })} /></td>
        <td><input aria-label={`入库第${index + 1}行采购单价`} required type="number" min="0" max="9999999.99" step="0.01" value={line.price} onChange={e => patch(line.key, { price: e.target.value })} /></td>
        <td className={s.numeric}>{money(total(line))}</td>
        <td><button type="button" className={s.iconButton} aria-label={`移除入库第${index + 1}行`} disabled={lines.length === 1} onClick={() => setLines(current => current.filter(l => l.key !== line.key))}><IconTrash size={17} /></button></td>
      </tr>; })}</tbody></table></div>
      <button type="button" className={s.textButton} disabled={lines.length >= 100 || !data.products.some(p => p.active !== false && p.initialized && !lines.some(l => l.productId === p.id))} onClick={() => setLines(current => [...current, { key: Math.max(...current.map(l => l.key)) + 1, productId: '', quantity: '1', price: '' }])}><IconPlus size={16} />添加入库商品</button>
      {duplicate && <p className={s.warning}>该供应商送货单号已有入库记录：{duplicate.number}。请核对本批实收数量，确认入库时需确认分批收货。</p>}
      <label className={s.field}>备注<textarea aria-label="入库备注" maxLength={1000} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="收货差异、零元采购原因等" /></label>
    </fieldset>
    <footer className={s.dialogFoot}><span className={s.total}>采购总金额<strong>{money(lines.reduce((sum, l) => sum + total(l), 0))}</strong></span><div className={s.actions}><button type="button" className={s.secondary} disabled={busy} onClick={onClose}>取消</button><button type="submit" className={s.primary} disabled={busy || quick !== null}>{busy ? '保存中…' : '保存入库草稿'}</button></div></footer>
  </form>;
}
