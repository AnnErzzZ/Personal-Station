'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { IconArrowRight, IconPlus, IconSearch } from '@tabler/icons-react';
import Dialog from './Dialog';
import PurchaseEditor from './PurchaseEditor';
import ListFilters from './ListFilters';
import { defaultFilters, selectRecords } from './filters';
import { money, orderTotal, receiptLabels, purchaseReturnSummary, purchaseReturnLabels, type Command, type Receipt, type Supplier, type Workspace } from './model';
import s from './erp.module.css';

type Overlay = { type: 'new' | 'edit' | 'detail' | 'confirm' | 'cancel' | 'reverse' | 'correct' | 'supplier' | 'supplier-status'; id?: string };
const time = (at: string) => new Date(at).toLocaleString('zh-CN', { hour12: false });
const badge = { draft: s.draft, received: s.shipped, cancelled: s.cancelled, reversed: s.pending };

export default function PurchaseWorkspace({ data, view, busy, initialId, initialSupplier, initialProduct, onMutate, onStock, onLedger, onSupplierReceipts, onSupplierProducts, onPurchaseReturn, onGuard }: {
  data: Workspace; view: 'receipts' | 'suppliers'; busy: boolean; initialId?: string; initialSupplier?: string; initialProduct?: string;
  onMutate: (command: Command) => Promise<Workspace>; onStock: (id: string) => void; onLedger: (id: string) => void; onSupplierReceipts: (id: string) => void; onSupplierProducts: (id: string) => void; onGuard: (guard: (() => boolean) | null) => void;
  onPurchaseReturn: (target: { id?: string; receiptId?: string; supplierId?: string; create?: boolean }) => void;
}) {
  const [filters, setFilters] = useState({ ...defaultFilters, supplier: initialSupplier ?? 'all' });
  const [overlay, setOverlay] = useState<Overlay | null>(initialId ? { type: 'detail', id: initialId } : initialProduct ? { type: 'new' } : null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const guard = () => !dirty || window.confirm('入库单有未保存的修改。离开将放弃这些修改，确定离开吗？');
    onGuard(guard);
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => { onGuard(null); window.removeEventListener('beforeunload', unload); };
  }, [dirty, onGuard]);
  const close = () => { if (!dirty || window.confirm('放弃入库单中未保存的修改吗？')) setOverlay(null); };
  const open = (type: Overlay['type'], id?: string) => { setNotice(''); setOverlay({ type, id }); };
  const receipt = data.receipts.find(r => r.id === overlay?.id);
  const supplier = data.suppliers.find(r => r.id === overlay?.id);
  const title = view === 'receipts' ? '采购入库' : '供应商管理';
  const { receipts, suppliers } = selectRecords(data, view, filters);
  const supplierName = (r: Receipt) => r.status === 'draft' ? data.suppliers.find(s => s.id === r.supplierId)?.name ?? '未知供应商' : r.supplierName ?? data.suppliers.find(s => s.id === r.supplierId)?.name ?? '未知供应商';
  const receiptTitle = overlay?.type === 'new' ? '新建采购入库单' : overlay?.type === 'edit' ? '编辑采购入库草稿' : overlay?.type === 'correct' ? '建立更正入库单' : overlay?.type === 'confirm' ? '确认采购入库' : overlay?.type === 'cancel' ? '取消采购入库草稿' : overlay?.type === 'reverse' ? '冲销采购入库' : '采购入库详情';
  const isSupplier = overlay?.type === 'supplier' || overlay?.type === 'supplier-status';
  const stats = view === 'receipts' ? [
    ['全部入库单', data.receipts.length], ['入库草稿', data.receipts.filter(r => r.status === 'draft').length],
    ['已冲销', data.receipts.filter(r => r.status === 'reversed').length], ['已入库金额', money(data.receipts.filter(r => r.status === 'received').reduce((sum, r) => sum + orderTotal(r), 0))],
  ] : [['供应商总数', data.suppliers.length], ['已启用', data.suppliers.filter(s => s.active !== false).length], ['已停用', data.suppliers.filter(s => s.active === false).length], ['关联入库单', data.receipts.length]];
  return <>
    <div className={s.pageHead}><div><h1>{title}</h1><p>{view === 'receipts' ? '记录本批实收货物，核对确认后更新库存。' : '维护供货方资料，查询每次采购入库的来源。'}</p></div><div className={s.actions}>
      <button type="button" className={view === 'suppliers' ? s.primary : s.secondary} disabled={busy} onClick={() => open('supplier')}><IconPlus size={17} />新增供应商</button>
      {view === 'receipts' && <button type="button" className={s.primary} disabled={busy} onClick={() => open('new')}><IconPlus size={18} />新建入库单</button>}
    </div></div>
    <div className={s.metrics}>{stats.map(([label, value]) => <div className={s.metric} key={String(label)}><div className={s.metricTop}>{label}</div><div className={s.metricValue}>{value}</div></div>)}</div>
    {notice && <div className={s.success} role="status">{notice}<button type="button" aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    <section className={s.panel} aria-label={title}>
      <div className={s.panelHeading}><h2>{title}<span>{view === 'receipts' ? receipts.length : suppliers.length}</span></h2><span className={s.panelCaption}>{view === 'receipts' ? '采购金额用于登记，不代表已付款' : '启停状态不影响历史单据'}</span></div>
      <div className={s.toolbar}><label className={s.search}><IconSearch size={18} /><input aria-label="搜索" value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} placeholder={view === 'receipts' ? '搜索入库单号、送货单号或供应商' : '搜索供应商、联系人或电话'} />{filters.query && <button type="button" aria-label="清空搜索" onClick={() => setFilters(f => ({ ...f, query: '' }))}>×</button>}</label><button type="button" className={s.filterButton} onClick={() => setFilters({ ...defaultFilters })}>重置筛选</button></div>
      <ListFilters view={view} data={data} value={filters} onChange={setFilters} />
      <div className={s.tableScroll}><table className={s.dataTable}>
        {view === 'receipts' ? <><thead><tr><th>入库单号 / 送货单号</th><th>供应商</th><th>收货日期</th><th className={s.numeric}>采购金额</th><th>状态</th><th className={s.right}>操作</th></tr></thead><tbody>{receipts.map(r => <tr key={r.id}>
          <td><button type="button" className={s.orderNumber} onClick={() => open('detail', r.id)}>{r.number}</button><small>{r.deliveryNumber || '未填写送货单号'}</small></td><td><strong>{supplierName(r)}</strong><small>{r.lines.length} 种商品</small></td><td>{r.receiptDate}</td><td className={s.numeric}>{money(orderTotal(r))}</td><td><span className={`${s.status} ${badge[r.status]}`}>{receiptLabels[r.status]}</span></td><td className={s.right}><button type="button" className={s.textButton} onClick={() => open('detail', r.id)}>查看详情<IconArrowRight size={15} /></button></td>
        </tr>)}</tbody></> : <><thead><tr><th>供应商 / 编号</th><th>联系人</th><th>电话</th><th>启用状态</th><th>供货商品</th><th>关联入库单</th><th className={s.right}>操作</th></tr></thead><tbody>{suppliers.map(p => <tr key={p.id}>
          <td><strong>{p.name}</strong><small>{p.id}</small></td><td>{p.contact || '未填写'}</td><td>{p.phone || '未填写'}</td><td><span className={`${s.status} ${p.active === false ? s.cancelled : s.shipped}`}>{p.active === false ? '已停用' : '已启用'}</span></td><td>{data.products.filter(product => product.supplierIds?.includes(p.id)).length} 种</td><td>{data.receipts.filter(r => r.supplierId === p.id).length} 笔</td><td><div className={s.customerActions}><button type="button" className={s.textButton} disabled={busy} aria-label={`编辑供应商 ${p.name}`} onClick={() => open('supplier', p.id)}>编辑</button><button type="button" className={s.textButton} disabled={busy} aria-label={`${p.active === false ? '启用' : '停用'}供应商 ${p.name}`} onClick={() => open('supplier-status', p.id)}>{p.active === false ? '启用' : '停用'}</button><button type="button" className={s.textButton} aria-label={`查看供应商 ${p.name} 的供货商品`} onClick={() => onSupplierProducts(p.id)}>查看供货商品</button><button type="button" className={s.textButton} aria-label={`查看供应商 ${p.name} 的入库单`} onClick={() => onSupplierReceipts(p.id)}>查看入库单</button><button type="button" className={s.textButton} onClick={() => onPurchaseReturn({ supplierId: p.id })}>查看采购退货</button></div></td>
        </tr>)}</tbody></>}
      </table></div>
      {(view === 'receipts' ? !receipts.length : !suppliers.length) && <div className={s.empty}><h3>{view === 'receipts' ? '没有符合条件的入库单' : '没有符合条件的供应商'}</h3><p>调整筛选条件，或使用页面上方的新增入口。</p></div>}
      <footer className={s.tableFooter}><span>{view === 'receipts' ? '草稿不增加库存；确认入库后整单生效；入库冲销保留来源。' : '供应商资料通过编号关联采购入库单，历史记录保留。'}</span><span>本地单用户</span></footer>
    </section>
    {overlay && <Dialog key={`${overlay.type}-${overlay.id ?? ''}`} title={isSupplier ? overlay.type === 'supplier' ? supplier ? '编辑供应商资料' : '新增供应商' : supplier?.active === false ? '启用供应商' : '停用供应商' : receiptTitle} wide={!isSupplier} busy={busy} onClose={close}>
      {overlay.type === 'supplier' && <SupplierEditor supplier={supplier} busy={busy} onSave={async fields => { await onMutate(supplier ? { type: 'update-supplier', supplierId: supplier.id, ...fields } : { type: 'add-supplier', ...fields }); setOverlay(null); setNotice('供应商资料已保存。'); }} />}
      {overlay.type === 'supplier-status' && supplier && <OperationForm busy={busy} label={supplier.active === false ? '确认启用供应商' : '确认停用供应商'} description={supplier.active === false ? '启用后可用于新建采购入库单。' : '停用后无法用于新建或确认入库草稿，已入库记录保留。'} onSubmit={async () => { await onMutate({ type: 'set-supplier-active', supplierId: supplier.id, active: supplier.active === false }); setOverlay(null); setNotice('供应商状态已更新。'); }} />}
      {(overlay.type === 'new' || overlay.type === 'edit' || overlay.type === 'correct') && <PurchaseEditor data={data} initialProduct={initialProduct} receipt={overlay.type === 'edit' ? receipt : undefined} corrects={overlay.type === 'correct' ? receipt : undefined} busy={busy} onMutate={onMutate} onDirty={setDirty} onClose={close} onSave={async input => { const next = await onMutate({ type: 'save-receipt', ...input }); setOverlay({ type: 'detail', id: input.receiptId ?? next.receipts.at(-1)!.id }); setNotice('入库草稿已保存，核对实物后确认。库存未变。'); }} />}
      {receipt && (overlay.type === 'detail' || overlay.type === 'confirm' || overlay.type === 'cancel' || overlay.type === 'reverse') && <div className={s.detail}>
        <div className={s.orderHero}><div><h3>{receipt.number}</h3><p>{supplierName(receipt)}</p></div><span className={`${s.status} ${badge[receipt.status]}`}>{receiptLabels[receipt.status]}</span></div>
        <div className={s.detailFacts}><div>收货日期<strong>{receipt.receiptDate}</strong></div><div>送货单号<strong>{receipt.deliveryNumber || '未填写'}</strong></div><div>主仓库 · {receipt.confirmedAt ? '实际入库时间' : '创建时间'}<strong>{time(receipt.confirmedAt ?? receipt.createdAt)}</strong></div></div>
        <div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>商品</th><th>实收数量</th><th>采购单价</th><th>金额</th><th>当前库存</th><th>操作</th></tr></thead><tbody>{receipt.lines.map(l => { const p = data.products.find(p => p.id === l.productId)!; return <tr key={l.productId}><td><strong>{receipt.status === 'draft' ? p.name : l.productName ?? p.name}</strong><small>{l.sku ?? p.sku}</small></td><td>{l.quantity} {l.unit ?? p.unit}</td><td>{money(l.unitPriceCents)}</td><td>{money(l.quantity * l.unitPriceCents)}</td><td>{p.stock}</td><td><button className={s.textButton} type="button" onClick={() => onStock(p.id)}>查看库存</button></td></tr>; })}</tbody></table></div>
        {(receipt.status === 'received' || data.purchaseReturns.some(r => r.receiptId === receipt.id)) && <div className={s.note}><span>采购退货：{purchaseReturnSummary(data, receipt.id)}</span><p>原实收及金额保留，实际退货另记出库流水。</p><div className={s.actions}><button type="button" className={s.textButton} onClick={() => onPurchaseReturn({ receiptId: receipt.id })}>查看关联采购退货</button>{data.purchaseReturns.filter(r => r.receiptId === receipt.id).map(r => <button type="button" key={r.id} className={s.textButton} onClick={() => onPurchaseReturn({ id: r.id })}>{r.number} · {purchaseReturnLabels[r.status]}</button>)}</div>{data.purchaseReturns.some(r => r.receiptId === receipt.id && r.status === 'returned') && <p className={s.warning}>原入库单已有实际采购退货，不能再整单冲销。</p>}</div>}
        {receipt.note && <p className={s.note}>备注：{receipt.note}</p>}
        {Boolean(receipt.temporaryProductIds?.length) && <p className={s.warning}>本单包含临时采购商品：{receipt.temporaryProductIds!.map(id => receipt.lines.find(l => l.productId === id)?.productName ?? id).join('、')}。确认入库时未关联本单供应商，实际供货记录已保留，商品供货关联保持不变。</p>}
        {receipt.reason && <p className={s.warning}>{receipt.status === 'reversed' ? '冲销' : '取消'}原因：{receipt.reason}{receipt.reversalNumber && ` · ${receipt.reversalNumber}`}</p>}
        {receipt.correctsId && <p className={s.note}>更正来源：<button type="button" className={s.orderNumber} onClick={() => open('detail', receipt.correctsId)}>{data.receipts.find(r => r.id === receipt.correctsId)?.number}</button></p>}
        {data.receipts.filter(r => r.correctsId === receipt.id).map(r => <p className={s.note} key={r.id}>关联更正单：<button type="button" className={s.orderNumber} onClick={() => open('detail', r.id)}>{r.number}</button> · {receiptLabels[r.status]}</p>)}
        {overlay.type === 'confirm' && receipt.lines.some(l => !data.products.find(p => p.id === l.productId)?.supplierIds?.includes(receipt.supplierId)) && <p className={s.warning}>本单含尚未关联该供应商的商品，将按临时采购记录。请核对供货方和本次采购价格；确认入库不会自动改变商品供货关联。</p>}
        {overlay.type === 'confirm' && <OperationForm busy={busy} nested label="确认收货并入库" description="请确认本批实物已核对并收妥。确认后按上述实收数量增加库存，单据明细保持只读。" duplicate={Boolean(receipt.deliveryNumber && data.receipts.some(r => r.id !== receipt.id && r.status === 'received' && r.supplierId === receipt.supplierId && r.deliveryNumber === receipt.deliveryNumber))} onSubmit={async (_, allowDuplicate) => { await onMutate({ type: 'confirm-receipt', receiptId: receipt.id, allowDuplicate }); setOverlay({ type: 'detail', id: receipt.id }); setNotice('采购入库成功，库存与流水已更新。'); }} />}
        {(overlay.type === 'cancel' || overlay.type === 'reverse') && <OperationForm busy={busy} nested reason label={overlay.type === 'cancel' ? '确认取消入库草稿' : '确认整单冲销'} description={overlay.type === 'cancel' ? '取消草稿保持库存不变，单据与取消原因保留。' : '仅用于录入错误纠正。将扣回原单全部实收数量并保留负数流水；库存不足会整单阻止。实际退回供应商请创建采购退货单；已有实际退货的原单不能整单冲销。'} onSubmit={async reason => { await onMutate({ type: overlay.type === 'cancel' ? 'cancel-receipt' : 'reverse-receipt', receiptId: receipt.id, reason }); setOverlay({ type: 'detail', id: receipt.id }); setNotice(overlay.type === 'cancel' ? '入库草稿已取消，库存未变。' : '整单冲销成功，原单及流水已保留。'); }} />}
        <h4 className={s.historyTitle}>操作记录</h4><ol className={s.history}>{receipt.history.toReversed().map((h, i) => <li key={`${h.at}-${i}`}><span className={s.historyDot} /><div>{h.action}<small>{h.actor} · {time(h.at)}</small></div></li>)}</ol>
        <footer className={s.dialogFoot}><span className={s.total}>采购金额<strong>{money(orderTotal(receipt))}</strong></span><div className={s.actions}>
          {overlay.type !== 'detail' && <button type="button" className={s.secondary} disabled={busy} onClick={() => open('detail', receipt.id)}>返回详情</button>}
          {overlay.type === 'detail' && receipt.status === 'draft' && <><button type="button" className={s.secondary} disabled={busy} onClick={() => open('edit', receipt.id)}>编辑入库草稿</button><button type="button" className={s.dangerButton} disabled={busy} onClick={() => open('cancel', receipt.id)}>取消入库草稿</button><button type="button" className={s.primary} disabled={busy} onClick={() => open('confirm', receipt.id)}>确认入库</button></>}
          {overlay.type === 'detail' && receipt.status === 'received' && <><button type="button" className={s.primary} disabled={busy || purchaseReturnSummary(data, receipt.id) === '全部退货'} title={purchaseReturnSummary(data, receipt.id) === '全部退货' ? '来源商品已全部退回' : '按原入库登记本次实际退货'} onClick={() => onPurchaseReturn({ receiptId: receipt.id, create: true })}>创建采购退货单</button><button type="button" className={s.dangerButton} disabled={busy || data.purchaseReturns.some(r => r.receiptId === receipt.id && r.status === 'returned')} title={data.purchaseReturns.some(r => r.receiptId === receipt.id && r.status === 'returned') ? '已有实际采购退货，不能整单冲销' : '用于原入库录入错误纠正'} onClick={() => open('reverse', receipt.id)}>冲销入库</button></>}
          {overlay.type === 'detail' && receipt.status === 'reversed' && !data.receipts.some(r => r.correctsId === receipt.id && r.status !== 'cancelled' && r.status !== 'reversed') && <button type="button" className={s.primary} disabled={busy} onClick={() => open('correct', receipt.id)}>建立更正入库单</button>}
          {receipt.status !== 'draft' && receipt.status !== 'cancelled' && <button type="button" className={s.secondary} onClick={() => onLedger(receipt.id)}>查看入库流水</button>}
        </div></footer>
      </div>}
    </Dialog>}
  </>;
}

function SupplierEditor({ supplier, busy, onSave }: { supplier?: Supplier; busy: boolean; onSave: (fields: { name: string; contact: string; phone: string }) => Promise<void> }) {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); try { await onSave({ name: String(form.get('name')), contact: String(form.get('contact')), phone: String(form.get('phone')) }); } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); } }
  return <form className={s.actionForm} onSubmit={submit}><p className={s.helper}>供应商用于关联采购入库，名称修改后原有入库记录保留。</p>{error && <div className={s.error} role="alert">{error}</div>}<fieldset className={s.fieldset} disabled={busy}>{[['name', '供应商名称', 80], ['contact', '联系人', 50], ['phone', '联系电话', 40]].map(([key, label, max]) => <label className={s.field} key={key}>{label}{key === 'name' && <span>*</span>}<input name={String(key)} required={key === 'name'} maxLength={Number(max)} type={key === 'phone' ? 'tel' : 'text'} defaultValue={supplier?.[key as 'name' | 'contact' | 'phone'] ?? ''} /></label>)}</fieldset><footer className={s.dialogFoot}><span /><button type="submit" className={s.primary} disabled={busy}>{busy ? '保存中…' : '保存供应商'}</button></footer></form>;
}

function OperationForm({ busy, label, description, reason = false, duplicate = false, nested = false, onSubmit }: { busy: boolean; label: string; description: string; reason?: boolean; duplicate?: boolean; nested?: boolean; onSubmit: (reason: string, allowDuplicate: boolean) => Promise<void> }) {
  const [error, setError] = useState(''); const [allowed, setAllowed] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const input = new FormData(event.currentTarget); try { await onSubmit(String(input.get('reason') ?? ''), allowed); } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); } }
  return <form className={nested ? s.receiptOperation : s.actionForm} onSubmit={submit}><p className={s.warning}>{description}</p>{error && <div className={s.error} role="alert">{error}</div>}{reason && <label className={s.field}>操作原因 <span>*</span><textarea required name="reason" maxLength={300} rows={3} disabled={busy} /></label>}{duplicate && <label className={s.duplicateCheck}><input type="checkbox" required checked={allowed} disabled={busy} onChange={e => setAllowed(e.target.checked)} />同一送货单号已有入库记录。我已核对，本次为另外一批实际收货。</label>}<div className={s.actions}><button type="submit" className={reason ? s.dangerSolid : s.primary} disabled={busy || (duplicate && !allowed)}>{busy ? '处理中…' : label}</button></div></form>;
}
