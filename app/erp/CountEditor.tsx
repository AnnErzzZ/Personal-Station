'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { countLineStale, inventoryToken, type CountInput, type StockCount, type Workspace } from './model';
import s from './erp.module.css';

type Line = { key: number; productId: string; bookQuantity: number; baselineLedgerId: string; actualQuantity: string; reason: string };

export default function CountEditor({ data, count, busy, onSave, onClose, onDirty, onReload }: {
  data: Workspace; count?: StockCount; busy: boolean; onSave: (input: CountInput) => Promise<void>;
  onClose: () => void; onDirty: (dirty: boolean) => void; onReload: () => Promise<Workspace>;
}) {
  const [revision] = useState(count?.revision);
  const [note, setNote] = useState(count?.note ?? '');
  const [lines, setLines] = useState<Line[]>(count?.lines.map((l, key) => ({ ...l, key, actualQuantity: String(l.actualQuantity) })) ?? [{ key: 0, productId: '', bookQuantity: 0, baselineLedgerId: '', actualQuantity: '', reason: '' }]);
  const [error, setError] = useState('');
  const [rechecking, setRechecking] = useState(false);
  const serialized = JSON.stringify({ note, lines });
  const [initial] = useState(serialized);
  const dirty = serialized !== initial;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const stale = lines.some(l => l.productId && countLineStale(data, l));
  const revisionChanged = Boolean(count && count.revision !== revision);
  const blocked = busy || rechecking;
  const patch = (key: number, fields: Partial<Line>) => setLines(current => current.map(l => l.key === key ? { ...l, ...fields } : l));
  function choose(key: number, productId: string) {
    const p = data.products.find(p => p.id === productId);
    patch(key, { productId, bookQuantity: p?.stock ?? 0, baselineLedgerId: inventoryToken(data, productId), actualQuantity: '', reason: '' });
  }
  async function recheck(key: number) {
    setError(''); setRechecking(true);
    try {
      const latest = await onReload();
      const line = lines.find(l => l.key === key)!;
      const p = latest.products.find(p => p.id === line.productId);
      if (!p?.initialized) throw new Error('商品不存在或尚未初始化，请重新选择');
      patch(key, { bookQuantity: p.stock, baselineLedgerId: inventoryToken(latest, p.id), actualQuantity: '', reason: '' });
    } catch (error) { setError(error instanceof Error ? error.message : '读取最新库存失败'); }
    finally { setRechecking(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (lines.some(l => !l.actualQuantity.trim())) { setError('请填写每一行的实盘数量，实物为零时请填 0'); return; }
    try { await onSave({ countId: count?.id, revision, note, lines: lines.map(({ productId, bookQuantity, baselineLedgerId, actualQuantity, reason }) => ({ productId, bookQuantity, baselineLedgerId, actualQuantity: Number(actualQuantity), reason })) }); }
    catch (error) { setError(error instanceof Error ? error.message : '盘点草稿保存失败'); }
  }
  return <form className={s.editor} onSubmit={save}>
    <p className={s.helper}>选择本次盘点商品，再清点实物并录入数量。保存草稿不调整库存，核对差异并确认盘点后才生效。主仓库 · 数量按整数录入。</p>
    {error && <div className={s.error} role="alert">{error}</div>}
    {revisionChanged && <p className={s.warning} role="alert">这张草稿已在其他页面更新，请关闭并重新打开后核对。当前修改尚未保存。</p>}
    {stale && <p className={s.warning} role="alert">部分商品在本次清点后发生了库存业务。请逐行点击“重新核对”，重新清点实物并填写数量。</p>}
    {!data.products.some(p => p.initialized) && <p className={s.warning}>暂无可盘点商品。请先在商品管理新增商品；旧待初始化商品需先完成期初设置。</p>}
    <fieldset className={s.fieldset} disabled={blocked || revisionChanged}>
      <div className={s.sectionLabel}><h3>盘点商品明细</h3><span>有差异时须填写原因</span></div>
      <div className={s.tableScroll}><table className={`${s.editTable} ${s.countEditTable}`}><thead><tr><th>商品</th><th>账面数量</th><th>实盘数量</th><th>差异</th><th>差异原因</th><th>操作</th></tr></thead><tbody>{lines.map((line, index) => {
        const product = data.products.find(p => p.id === line.productId);
        const changed = Boolean(product && countLineStale(data, line));
        const difference = line.actualQuantity.trim() && Number.isFinite(Number(line.actualQuantity)) ? Number(line.actualQuantity) - line.bookQuantity : null;
        return <tr key={line.key}>
          <td><select required aria-label={`盘点第${index + 1}行商品`} value={line.productId} onChange={e => choose(line.key, e.target.value)}><option value="">请选择商品</option>{data.products.filter(p => p.initialized && (p.id === line.productId || !lines.some(l => l.productId === p.id))).map(p => <option key={p.id} value={p.id}>{p.name}{p.active === false ? '（已停用）' : ''}</option>)}</select>{product && <small>{product.sku} · {product.unit}</small>}</td>
          <td>{product ? line.bookQuantity : '—'}{changed && <small className={s.dangerText}>当前 {product?.stock}，须重新核对</small>}</td>
          <td><input required type="number" aria-label={`盘点第${index + 1}行实盘数量`} min="0" max="1000000" step="1" placeholder="待清点" value={line.actualQuantity} disabled={!product || changed} onChange={e => patch(line.key, { actualQuantity: e.target.value })} /></td>
          <td className={`${s.numeric} ${difference && difference > 0 ? s.positive : difference && difference < 0 ? s.dangerText : ''}`}>{difference === null ? '—' : difference > 0 ? `+${difference}` : difference}</td>
          <td><input aria-label={`盘点第${index + 1}行差异原因`} required={difference !== null && difference !== 0} maxLength={300} value={line.reason} placeholder={difference ? '填写差异原因' : '选填'} onChange={e => patch(line.key, { reason: e.target.value })} /></td>
          <td><div className={s.countRowActions}><button type="button" className={s.textButton} disabled={!product} aria-label={`重新核对盘点第${index + 1}行`} onClick={() => { void recheck(line.key); }}>重新核对</button><button type="button" className={s.iconButton} disabled={lines.length === 1} aria-label={`移除盘点第${index + 1}行`} onClick={() => setLines(current => current.filter(l => l.key !== line.key))}><IconTrash size={17} /></button></div></td>
        </tr>;
      })}</tbody></table></div>
      <button type="button" className={s.textButton} disabled={lines.length >= 100 || !data.products.some(p => p.initialized && !lines.some(l => l.productId === p.id))} onClick={() => setLines(current => [...current, { key: Math.max(...current.map(l => l.key)) + 1, productId: '', bookQuantity: 0, baselineLedgerId: '', actualQuantity: '', reason: '' }])}><IconPlus size={16} />添加盘点商品</button>
      <p className={s.helper}>“重新核对”会读取最新账面数量，并清空该行的实盘数量及原因，请重新清点后填写。已停用但仍有实物的商品也可以盘点。</p>
      <label className={s.field}>盘点备注<textarea aria-label="盘点备注" maxLength={1000} rows={3} value={note} placeholder="选填，例如盘点范围、清点情况" onChange={e => setNote(e.target.value)} /></label>
    </fieldset>
    <footer className={s.dialogFoot}><span className={s.helper}>保存草稿后，还需核对并确认盘点。</span><div className={s.actions}><button type="button" className={s.secondary} disabled={blocked} onClick={onClose}>取消</button><button type="submit" className={s.primary} disabled={blocked || stale || revisionChanged}>{blocked ? '处理中…' : '保存盘点草稿'}</button></div></footer>
  </form>;
}
