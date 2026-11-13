import { useState, type FormEvent } from 'react';
import type { Command, Workspace } from './model';
import s from './erp.module.css';

export default function OpeningSetup({ data, initialId, busy, onSave }: { data: Workspace; initialId?: string; busy: boolean; onSave: (command: Command) => Promise<void> }) {
  const [productId, setProduct] = useState(initialId ?? data.products.find(p => !p.initialized)?.id ?? '');
  const [mode, setMode] = useState('opening'); const [amount, setAmount] = useState('0'); const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); try { await onSave({ type: 'initialize', productId, quantity: mode === 'zero' ? 0 : Number(amount) }); } catch (error) { setError(error instanceof Error ? error.message : '期初设置失败'); } }
  return <form className={s.actionForm} onSubmit={submit}><p className={s.helper}>仅处理旧商品启用系统时已有的库存。日常进货请使用采购入库，每个商品只能设置一次。</p>{error && <p className={s.error} role="alert">{error}</p>}<fieldset className={s.fieldset} disabled={busy}>
    <label className={s.field}>商品<select required name="productId" value={productId} onChange={e => setProduct(e.target.value)}><option value="">请选择待初始化商品</option>{data.products.filter(p => !p.initialized).map(p => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></label>
    <label className={s.field}>启用方式<select aria-label="期初启用方式" value={mode} onChange={e => setMode(e.target.value)}><option value="opening">录入已有期初库存</option><option value="zero">确认没有历史库存，按零启用</option></select></label>
    {mode === 'opening' ? <label className={s.field}>期初数量<input name="quantity" type="number" required min="0" max="1000000" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label> : <p className={s.warning}>请确认该商品没有待补录的历史库存。启用后库存为零，后续通过采购入库增加，期初入口将关闭。</p>}
  </fieldset><footer className={s.dialogFoot}><span /><button type="submit" className={s.primary} disabled={busy || !productId}>{mode === 'zero' ? '确认零库存启用' : '确认期初库存'}</button></footer></form>;
}
