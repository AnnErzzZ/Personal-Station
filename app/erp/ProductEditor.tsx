import { useState, type FormEvent } from 'react';
import type { Product, ProductInput, Supplier } from './model';
import s from './erp.module.css';

export default function ProductEditor({ product, suppliers, locked, busy, onSave }: { product?: Product; suppliers: Supplier[]; locked: boolean; busy: boolean; onSave: (input: ProductInput) => Promise<void> }) {
  const [supplierIds, setSuppliers] = useState(product?.supplierIds ?? []);
  const [defaultId, setDefault] = useState(product?.defaultSupplierId ?? '');
  const [query, setQuery] = useState(''); const [error, setError] = useState('');
  const visible = suppliers.filter(s => (s.active !== false || supplierIds.includes(s.id)) && `${s.name} ${s.contact ?? ''} ${s.phone ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  function toggle(id: string, checked: boolean) { setSuppliers(current => checked ? [...current, id] : current.filter(value => value !== id)); if (!checked && id === defaultId) setDefault(''); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); const f = new FormData(event.currentTarget);
    try { await onSave({ name: String(f.get('name')), sku: String(f.get('sku')), unit: String(f.get('unit')), price: String(f.get('price')), supplierIds, defaultSupplierId: defaultId }); }
    catch (error) { setError(error instanceof Error ? error.message : '商品保存失败'); }
  }
  return <form className={s.actionForm} onSubmit={submit}>
    <p className={s.helper}>{locked ? '已有业务记录，编码和单位已锁定。资料和供货关联修改后，历史订单与入库单保持原值。' : '维护商品基础资料，可关联多家供应商并指定默认供货方。新商品从零库存开始。'}</p>
    {error && <div className={s.error} role="alert">{error}</div>}
    <fieldset className={s.fieldset} disabled={busy}>
      <div className={s.formGrid}>
        <label className={s.field}>商品名称 <span>*</span><input name="name" required maxLength={80} defaultValue={product?.name} /></label>
        <label className={s.field}>商品编码 <span>*</span><input name="sku" required maxLength={40} readOnly={locked} defaultValue={product?.sku} placeholder="例如 CH-002，不可重复" /></label>
        <label className={s.field}>销售单位 <span>*</span><input name="unit" required maxLength={8} readOnly={locked} defaultValue={product?.unit} placeholder="例如 把、张、套" /></label>
        <label className={s.field}>参考售价（元） <span>*</span><input name="price" required type="number" min="0" max="9999999.99" step="0.01" defaultValue={product ? (product.priceCents / 100).toFixed(2) : '0'} /></label>
      </div>
      <div className={s.sectionLabel}><h3>供货供应商</h3><span>选填 · 可多选 · 已选 {supplierIds.length} 家</span></div>
      <p className={s.helper}>关联用于开单推荐。本次实际供货方和采购单价由入库单记录，库存按商品统一汇总。</p>
      <label className={s.supplierSearch}>查找供应商<input aria-label="搜索可关联供应商" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="名称、联系人或电话" /></label>
      <div className={s.supplierChoices} role="group" aria-label="关联供应商选择">{visible.map(supplier => <label className={s.supplierChoice} key={supplier.id}>
        <input type="checkbox" aria-label={`关联供应商 ${supplier.name}`} checked={supplierIds.includes(supplier.id)} disabled={busy || (supplier.active === false && !supplierIds.includes(supplier.id))} onChange={e => toggle(supplier.id, e.target.checked)} />
        <span>{supplier.name}<small>{supplier.active === false ? '已停用，保留原关联' : supplier.contact || supplier.phone || '已启用'}</small></span>
      </label>)}{!visible.length && <p className={s.helper}>{suppliers.length ? '没有匹配的可选供应商，请调整搜索；停用供应商可在供应商管理中重新启用。' : '暂无供应商，可先保存商品，再到供应商管理新增后关联。'}</p>}</div>
      <label className={s.field}>默认供应商<select aria-label="默认供应商" value={defaultId} onChange={e => setDefault(e.target.value)}><option value="">不设置默认供应商</option>{suppliers.filter(s => supplierIds.includes(s.id)).map(s => <option key={s.id} value={s.id} disabled={s.active === false}>{s.name}{s.active === false ? '（已停用）' : ''}</option>)}</select></label>
      {suppliers.some(s => s.id === defaultId && s.active === false) && <p className={s.warning}>默认供应商已停用，当前关联会保留，新入库单不会自动选用。可以重新指定默认供应商或在供应商管理中启用。</p>}
    </fieldset>
    <footer className={s.dialogFoot}><span /><button type="submit" className={s.primary} disabled={busy}>{busy ? '保存中…' : product ? '保存修改' : '保存商品'}</button></footer>
  </form>;
}
