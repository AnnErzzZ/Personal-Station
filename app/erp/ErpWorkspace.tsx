'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { IconArrowDownLeft, IconArrowRight, IconArrowUpRight, IconBox, IconCheck, IconChevronRight, IconClipboardList, IconDownload, IconPackage, IconPlus, IconSearch, IconTruckDelivery, IconUsers } from '@tabler/icons-react';
import Dialog from './Dialog';
import CustomerTable from './CustomerTable';
import ProductCatalog from './ProductCatalog';
import ProductEditor from './ProductEditor';
import PurchaseWorkspace from './PurchaseWorkspace';
import CountWorkspace from './CountWorkspace';
import SalesReturnWorkspace from './SalesReturnWorkspace';
import PurchaseReturnWorkspace from './PurchaseReturnWorkspace';
import OpeningSetup from './OpeningSetup';
import ListFilters from './ListFilters';
import { defaultFilters, selectRecords, type Filters } from './filters';
import ErpNavigation from './ErpNavigation';
import { getNavigation, type View } from './navigation';
import OrderEditor from './OrderEditor';
import { createEmptyState, day, money, orderTotal, statusLabels, productIsUsed, ledgerLabels, salesReturnSummary, salesReturnLabels, type Command, type Order, type OrderStatus, type Workspace } from './model';
import { transact } from './storage';
import s from './erp.module.css';

type Overlay = { type: 'new' | 'edit' | 'detail' | 'ship' | 'cancel' | 'product' | 'product-status' | 'customer' | 'initialize'; id?: string };
type Notice = { text: string; error?: boolean; productId?: string };
const viewTitles: Record<View, string> = { orders: '销售订单', shipping: '待出库', stock: '库存查询', ledger: '库存流水', customers: '客户管理', products: '商品管理', receipts: '采购入库', suppliers: '供应商管理', counts: '库存盘点', salesReturns: '销售退货', purchaseReturns: '采购退货' };
const viewCopy: Record<View, string> = { orders: '从客户下单到仓库出库，每一笔订单都有迹可循。', shipping: '核对实物，完成交接后确认出库。', stock: '查看商品的账面库存，追溯每一次数量变化。', ledger: '记录库存的来处与去向，关联到每一笔业务。', customers: '统一维护客户资料，随时查看关联销售订单。', products: '维护销售使用的商品资料，并查看对应库存。', receipts: '记录实际收货并增加库存。', suppliers: '维护供货方及其关联单据。', counts: '核对实物数量并记录盘盈盘亏。', salesReturns: '验收合格后按原单退货入库。', purchaseReturns: '关联原入库并交接退回供应商。' };
const time = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const badgeClass: Record<OrderStatus, string> = { draft: s.draft, pending: s.pending, shipped: s.shipped, cancelled: s.cancelled };

export default function ErpWorkspace() {
  const [data, setData] = useState<Workspace | null>(null);
  const [view, setView] = useState<View>('orders');
  const [purchaseTarget, setPurchaseTarget] = useState<{ receiptId?: string; supplierId?: string; productId?: string }>({});
  const [countTarget, setCountTarget] = useState<string>();
  const [purchaseReturnTarget, setPurchaseReturnTarget] = useState<{ id?: string; receiptId?: string; supplierId?: string; create?: boolean }>({});
  const [returnTarget, setReturnTarget] = useState<{ id?: string; orderId?: string; create?: boolean }>({});
  const navigationGuard = useRef<(() => boolean) | null>(null);
  const registerGuard = useCallback((guard: (() => boolean) | null) => { navigationGuard.current = guard; }, []);
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const { query, status } = filters;
  const hasFilters = Object.entries(defaultFilters).some(([key, value]) => filters[key as keyof Filters] !== value);
  const customerFilter = filters.customer === 'all' ? null : filters.customer;
  const setQuery = (query: string) => setFilters(f => ({ ...f, query }));
  const setStatus = (status: string) => setFilters(f => ({ ...f, status }));
  const setProductFilter = (product: string) => setFilters(f => ({ ...f, product }));
  const setCustomerFilter = (customer: string | null) => setFilters(f => ({ ...f, customer: customer ?? 'all' }));
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const refresh = useCallback(async () => {
    try { setData(await transact()); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : '工作区读取失败', error: true }); }
  }, []);
  useEffect(() => {
    let active = true;
    transact().then(state => { if (active) setData(state); }).catch(error => { if (active) setNotice({ text: error instanceof Error ? error.message : '工作区读取失败', error: true }); });
    if ('BroadcastChannel' in window) { channel.current = new BroadcastChannel('xu-cang-erp-updates'); channel.current.onmessage = () => { void refresh(); }; }
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; channel.current?.close(); channel.current = null; window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  async function mutate(command: Command) {
    setBusy(true);
    try { const updated = await transact(command); setData(updated); channel.current?.postMessage('updated'); return updated; }
    finally { setBusy(false); }
  }
  async function act(command: Command, success: string) {
    try { await mutate(command); setNotice({ text: success }); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : '操作失败', error: true }); }
  }
  function navigate(next: View) { if (navigationGuard.current && !navigationGuard.current()) return false; setOverlay(null); setPurchaseTarget({}); setCountTarget(undefined); setReturnTarget({}); setPurchaseReturnTarget({}); setView(next); setFilters({ ...defaultFilters }); setNotice(null); window.scrollTo({ top: 0, behavior: 'auto' }); return true; }
  function showReturn(target: typeof returnTarget) { if (navigate('salesReturns')) setReturnTarget(target); }
  function showPurchaseReturn(target: typeof purchaseReturnTarget) { if (navigate('purchaseReturns')) setPurchaseReturnTarget(target); }
  async function exportData() {
    try {
      const latest = await transact(); setData(latest);
      const url = URL.createObjectURL(new Blob([JSON.stringify(latest, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `序仓ERP-备份-${day()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ text: '工作区数据已导出为 JSON 文件。' });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : '导出失败', error: true }); }
  }
  const open = (type: Overlay['type'], id?: string) => { setNotice(null); setOverlay({ type, id }); };
  const customerName = (order: Order) => data?.customers.find(c => c.id === order.customerId)?.name ?? '未知客户';
  const pending = data?.orders.filter(o => o.status === 'pending') ?? [];
  const selected = data?.orders.find(o => o.id === overlay?.id);
  const selectedCustomer = overlay?.type === 'customer' ? data?.customers.find(c => c.id === overlay.id) : undefined;
  const selectedProduct = overlay?.type === 'product' || overlay?.type === 'product-status' ? data?.products.find(p => p.id === overlay.id) : undefined;
  const productLocked = Boolean(data && selectedProduct && productIsUsed(data, selectedProduct.id));
  const activeNavigation = getNavigation(view);
  const scopedOrders = (data?.orders ?? []).filter(order => !customerFilter || order.customerId === customerFilter);
  const { orders, products, customers, ledger } = selectRecords(data ?? createEmptyState(), view, filters);
  const metrics = view === 'customers' ? [
    { label: '客户总数', value: data?.customers.length ?? 0, unit: '位', icon: IconUsers },
    { label: '有订单客户', value: data?.customers.filter(c => data.orders.some(o => o.customerId === c.id)).length ?? 0, unit: '位', icon: IconClipboardList },
    { label: '未开单客户', value: data?.customers.filter(c => !data.orders.some(o => o.customerId === c.id)).length ?? 0, unit: '位', icon: IconUsers },
    { label: '待出库订单', value: pending.length, unit: '笔', icon: IconTruckDelivery },
  ] : view === 'stock' || view === 'ledger' || view === 'products' ? [
    { label: '商品品类', value: data?.products.length ?? 0, unit: '种', icon: IconPackage },
    { label: '低库存商品', value: data?.products.filter(p => p.initialized && p.stock > 0 && p.stock <= 10).length ?? 0, unit: '种', icon: IconBox },
    { label: '缺货商品', value: data?.products.filter(p => p.initialized && p.stock === 0).length ?? 0, unit: '种', icon: IconTruckDelivery },
    { label: '待初始化', value: data?.products.filter(p => !p.initialized).length ?? 0, unit: '种', icon: IconClipboardList },
  ] : [
    { label: '全部订单', value: data?.orders.length ?? 0, unit: '笔', icon: IconClipboardList },
    { label: '待出库', value: pending.length, unit: '笔', icon: IconTruckDelivery },
    { label: '已出库', value: data?.orders.filter(o => o.status === 'shipped').length ?? 0, unit: '笔', icon: IconCheck },
    { label: '有效订单金额', value: money(data?.orders.filter(o => o.status === 'pending' || o.status === 'shipped').reduce((sum, order) => sum + orderTotal(order), 0) ?? 0), unit: '', icon: IconArrowUpRight },
  ];

  return <main className={s.app}>
    <aside className={s.sidebar}>
      <div className={s.brand}><span className={s.brandIcon}><IconBox size={25} stroke={1.7} /></span><div>序仓 <span>ERP</span><small>销售与库存工作空间</small></div></div>
      <div className={s.workspaceBadge}><span className={s.workspaceAvatar}>序</span><div>本地工作区<small>单仓库 · 办公用品</small></div></div>
      <ErpNavigation view={view} pendingCount={pending.length} onNavigate={navigate} />
      <div className={s.sidebarBottom}><div className={s.localNote}><span className={s.liveDot} />数据保存在当前浏览器</div><p>首次载入示例数据，可直接体验开单与出库。</p><button className={s.backupButton} type="button" disabled={!data || busy} onClick={() => { void exportData(); }}><IconDownload size={16} />导出工作区备份</button></div>
    </aside>
    <div className={s.mainArea}>
      <header className={s.topbar}><div className={s.breadcrumb}>工作空间<IconChevronRight size={14} /><span>{activeNavigation.groupLabel}</span><IconChevronRight size={14} /><span aria-current="page">{activeNavigation.label}</span></div><div className={s.user}><span className={s.today}>{day().replaceAll('-', '.')}</span><span className={s.userAvatar}>本</span><span>本地用户</span></div></header>
      <div className={s.content}>
        {data && view === 'purchaseReturns' ? <PurchaseReturnWorkspace key={`${purchaseReturnTarget.id ?? ''}-${purchaseReturnTarget.receiptId ?? ''}-${purchaseReturnTarget.supplierId ?? ''}-${purchaseReturnTarget.create ?? ''}`} data={data} busy={busy} initialId={purchaseReturnTarget.id} initialReceiptId={purchaseReturnTarget.receiptId} initialSupplierId={purchaseReturnTarget.supplierId} create={purchaseReturnTarget.create} onMutate={mutate} onReload={async () => { const latest = await transact(); setData(latest); return latest; }} onGuard={registerGuard} onReceipt={id => { if (navigate('receipts')) setPurchaseTarget({ receiptId: id }); }} onLedger={id => { if (navigate('ledger')) setFilters(f => ({ ...f, purchaseReturn: id })); }} onStock={id => { if (navigate('stock')) setProductFilter(id); }} /> : data && view === 'salesReturns' ? <SalesReturnWorkspace key={`${returnTarget.id ?? ''}-${returnTarget.orderId ?? ''}-${returnTarget.create ?? ''}`} data={data} busy={busy} initialId={returnTarget.id} initialOrderId={returnTarget.orderId} create={returnTarget.create} onMutate={mutate} onReload={async () => { const latest = await transact(); setData(latest); return latest; }} onGuard={registerGuard} onOrder={id => { if (navigate('orders')) setOverlay({ type: 'detail', id }); }} onLedger={id => { if (navigate('ledger')) setFilters(f => ({ ...f, salesReturn: id })); }} onStock={id => { if (navigate('stock')) setProductFilter(id); }} /> : data && view === 'counts' ? <CountWorkspace key={countTarget ?? 'counts'} data={data} busy={busy} initialId={countTarget} onMutate={mutate} onReload={async () => { const latest = await transact(); setData(latest); return latest; }} onGuard={registerGuard} onLedger={id => { navigate('ledger'); setFilters(f => ({ ...f, count: id })); }} /> : data && (view === 'receipts' || view === 'suppliers') ? <PurchaseWorkspace key={`${view}-${purchaseTarget.receiptId ?? ''}-${purchaseTarget.supplierId ?? ''}-${purchaseTarget.productId ?? ''}`} data={data} view={view} busy={busy} initialId={purchaseTarget.receiptId} initialSupplier={purchaseTarget.supplierId} initialProduct={purchaseTarget.productId} onMutate={mutate} onGuard={registerGuard} onPurchaseReturn={showPurchaseReturn} onSupplierReceipts={id => { navigate('receipts'); setPurchaseTarget({ supplierId: id }); }} onSupplierProducts={id => { navigate('products'); setFilters(f => ({ ...f, supplier: id })); }} onStock={id => { navigate('stock'); setQuery(data.products.find(p => p.id === id)?.sku ?? ''); }} onLedger={id => { navigate('ledger'); setFilters(f => ({ ...f, receipt: id })); }} /> : <>

        <div className={s.pageHead}><div><div className={s.eyebrow}>SALES & INVENTORY</div><h1>{viewTitles[view]}</h1><p>{viewCopy[view]}</p></div><div className={s.actions}>
          {(view === 'orders' || view === 'shipping') && <><button type="button" className={s.secondary} disabled={!data || busy} onClick={() => open('customer')}><IconUsers size={17} />新增客户</button><button type="button" className={s.primary} disabled={!data || busy} onClick={() => open('new')}><IconPlus size={18} />新建订单</button></>}
          {(view === 'stock' || view === 'products') && <><>{view === 'stock' && <button type="button" className={s.secondary} disabled={!data || busy || !data.products.some(p => !p.initialized)} onClick={() => open('initialize')}>期初设置</button>}</><button type="button" className={s.primary} disabled={!data || busy} onClick={() => open('product')}><IconPlus size={18} />新增商品</button></>}
          {view === 'ledger' && <button type="button" className={s.secondary} disabled={!data || busy} onClick={() => { void exportData(); }}><IconDownload size={17} />导出备份</button>}
          {view === 'customers' && <button type="button" className={s.primary} disabled={!data || busy} onClick={() => open('customer')}><IconPlus size={18} />新增客户</button>}
        </div></div>
        <div className={s.metrics}>{metrics.map(metric => <div className={s.metric} key={metric.label}><div className={s.metricTop}>{metric.label}<metric.icon size={18} stroke={1.5} /></div><div className={s.metricValue}>{data ? metric.value : '—'}<span>{metric.unit}</span></div></div>)}</div>
        {notice && <div role={notice.error ? 'alert' : 'status'} className={notice.error ? s.error : s.success}>{notice.text}{notice.productId && <button type="button" className={s.textButton} onClick={() => { navigate('receipts'); setPurchaseTarget({ productId: notice.productId }); }}>去创建采购入库单</button>}<button type="button" aria-label="关闭提示" onClick={() => setNotice(null)}>×</button></div>}
        {!data ? <div className={s.loading}>{notice?.error ? <><p>工作区暂时无法打开，已有数据不会被重置。</p><button className={s.secondary} onClick={() => { void refresh(); }}>重新读取</button></> : '正在打开本地工作区…'}</div> : <section className={s.panel} aria-label={viewTitles[view]}>
          <div className={s.panelHeading}><h2>{view === 'orders' ? '订单列表' : viewTitles[view]}<span>{view === 'orders' || view === 'shipping' ? orders.length : view === 'stock' || view === 'products' ? products.length : view === 'customers' ? customers.length : ledger.length}</span></h2><span className={s.panelCaption}>{view === 'orders' ? '订单金额不代表实际收款' : view === 'shipping' ? '确认出库后更新库存' : view === 'customers' ? '客户名称与联系方式' : view === 'products' ? '商品基础资料' : '主仓库'}</span></div>
          {view === 'orders' && <div className={s.tabs} role="group" aria-label="按订单状态筛选">{(['all', 'draft', 'pending', 'shipped', 'cancelled'] as const).map(item => <button key={item} type="button" className={status === item ? s.tabActive : ''} aria-pressed={status === item} onClick={() => setStatus(item)}>{item === 'all' ? '全部订单' : statusLabels[item]}<span>{item === 'all' ? scopedOrders.length : scopedOrders.filter(o => o.status === item).length}</span></button>)}</div>}
          <div className={s.toolbar}><label className={s.search}><IconSearch size={18} /><input aria-label="搜索" placeholder={view === 'orders' || view === 'shipping' ? '搜索订单、客户或日期' : view === 'stock' || view === 'products' ? '搜索商品名称、编码' : view === 'customers' ? '搜索客户、联系人或电话' : '搜索商品、单号或日期'} value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}>×</button>}</label>
            <button type="button" className={s.filterButton} onClick={() => setFilters({ ...defaultFilters })}>重置筛选</button>
            {view === 'orders' && customerFilter && <button type="button" className={s.filterButton} onClick={() => setCustomerFilter(null)} aria-label="清除客户筛选">客户：{data.customers.find(c => c.id === customerFilter)?.name}<span>×</span></button>}
            {view === 'orders' && <span className={s.toolbarHint}>共 {orders.length} 笔订单</span>}
          </div>
          {view === 'ledger' && filters.receipt !== 'all' && <div className={s.receiptScope}>入库单：{data.receipts.find(r => r.id === filters.receipt)?.number}<button type="button" className={s.textButton} onClick={() => setFilters(f => ({ ...f, receipt: 'all' }))}>清除入库单筛选</button></div>}
          {view === 'ledger' && filters.purchaseReturn !== 'all' && <div className={s.receiptScope}>采购退货单：{data.purchaseReturns.find(r => r.id === filters.purchaseReturn)?.number}<button type="button" className={s.textButton} onClick={() => setFilters(f => ({ ...f, purchaseReturn: 'all' }))}>清除采购退货单筛选</button></div>}
          {view === 'ledger' && filters.salesReturn !== 'all' && <div className={s.receiptScope}>退货单：{data.salesReturns.find(r => r.id === filters.salesReturn)?.number}<button type="button" className={s.textButton} onClick={() => setFilters(f => ({ ...f, salesReturn: 'all' }))}>清除退货单筛选</button></div>}
          {view === 'ledger' && filters.count !== 'all' && <div className={s.receiptScope}>盘点单：{data.counts.find(c => c.id === filters.count)?.number}<button type="button" className={s.textButton} onClick={() => setFilters(f => ({ ...f, count: 'all' }))}>清除盘点单筛选</button></div>}
          <ListFilters view={view} data={data} value={filters} onChange={setFilters} />
          {(view === 'orders' || view === 'shipping') && <><div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>订单编号</th><th>客户名称</th><th>期望发货日期</th><th className={s.numeric}>订单金额</th><th>订单状态</th><th className={s.right}>操作</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><button type="button" className={s.orderNumber} onClick={() => open('detail', order.id)}>{order.number}</button><small>{time(order.createdAt)} 创建</small></td><td><strong className={s.customer}>{customerName(order)}</strong><small>{order.lines.length} 种商品</small></td><td>{order.deliveryDate}</td><td className={s.numeric}>{money(orderTotal(order))}</td><td><span className={`${s.status} ${badgeClass[order.status]}`}>{statusLabels[order.status]}</span></td><td className={s.right}><button type="button" className={s.textButton} onClick={() => open(view === 'shipping' ? 'ship' : 'detail', order.id)}>{view === 'shipping' ? '确认出库' : '查看详情'}<IconArrowRight size={15} /></button></td></tr>)}</tbody></table></div>{!orders.length && <Empty title={hasFilters ? '没有符合条件的订单' : view === 'shipping' ? '当前没有待出库订单' : '还没有销售订单'} detail={view === 'shipping' ? '销售提交订单后，会出现在这里。' : '调整筛选条件，或新建一笔销售订单。'} />}</>}
          {view === 'stock' && <><div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>商品信息</th><th>单位</th><th className={s.numeric}>参考售价</th><th className={s.numeric}>当前库存</th><th>库存状态</th><th className={s.right}>操作</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><div className={s.productInfo}><span className={s.productIcon}><IconPackage size={21} stroke={1.5} /></span><div><strong>{product.name}</strong><small>{product.sku}</small></div></div></td><td>{product.unit}</td><td className={s.numeric}>{money(product.priceCents)}</td><td className={`${s.numeric} ${s.stockNumber}`}>{product.initialized ? product.stock : '—'}</td><td><span className={`${s.status} ${!product.initialized ? s.draft : product.stock === 0 ? s.outOfStock : product.stock <= 10 ? s.pending : s.shipped}`}>{!product.initialized ? '待初始化' : product.stock === 0 ? '已缺货' : product.stock <= 10 ? '库存偏低' : '库存充足'}</span></td><td className={s.right}>{!product.initialized ? <button type="button" className={s.textButton} onClick={() => open('initialize', product.id)}>录入期初</button> : <button type="button" className={s.textButton} onClick={() => { navigate('ledger'); setProductFilter(product.id); }}>查看流水<IconArrowRight size={15} /></button>}</td></tr>)}</tbody></table></div>{!products.length && <Empty title="没有符合条件的商品" detail="调整筛选条件，或新增商品并录入期初库存。" />}</>}
          {view === 'ledger' && <><div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>商品 / 发生时间</th><th>业务类型</th><th className={s.numeric}>变动数量</th><th className={s.numeric}>变动后库存</th><th>关联单号</th><th>操作人</th></tr></thead><tbody>{ledger.map(entry => { const product = data.products.find(p => p.id === entry.productId)!; return <tr key={entry.id}><td><strong>{product.name}</strong><small>{time(entry.at)} · {product.sku}</small>{entry.businessDate && <small>业务日期 {entry.businessDate}</small>}</td><td><span className={`${s.ledgerKind} ${entry.change > 0 ? s.positive : s.muted}`}>{entry.change > 0 ? <IconArrowDownLeft size={16} /> : <IconArrowUpRight size={16} />}{ledgerLabels[entry.kind]}</span></td><td className={`${s.numeric} ${entry.change > 0 ? s.positive : ''}`}>{entry.change > 0 ? '+' : ''}{entry.change} {product.unit}</td><td className={s.numeric}>{entry.balance} {product.unit}</td><td>{entry.purchaseReturnId ? <button type="button" className={s.orderNumber} onClick={() => showPurchaseReturn({ id: entry.purchaseReturnId })}>{entry.reference}</button> : entry.salesReturnId ? <button type="button" className={s.orderNumber} onClick={() => showReturn({ id: entry.salesReturnId })}>{entry.reference}</button> : entry.countId ? <button type="button" className={s.orderNumber} onClick={() => { navigate('counts'); setCountTarget(entry.countId); }}>{entry.reference}</button> : entry.receiptId ? <button type="button" className={s.orderNumber} onClick={() => { navigate('receipts'); setPurchaseTarget({ receiptId: entry.receiptId }); }}>{entry.reference}</button> : entry.orderId ? <button type="button" className={s.orderNumber} onClick={() => open('detail', entry.orderId)}>{entry.reference}</button> : <span className={s.reference}>{entry.reference}</span>}</td><td>{entry.actor}</td></tr>; })}</tbody></table></div>{!ledger.length && <Empty title="没有符合条件的库存流水" detail="库存业务确认后会生成流水，可按商品和业务类型查询。" />}</>}
          {view === 'products' && <ProductCatalog products={products} suppliers={data.suppliers} busy={busy} onEdit={id => open('product', id)} onToggle={id => open('product-status', id)} onStock={product => { navigate('stock'); setQuery(product.sku); }} onInitialize={id => { navigate('stock'); setQuery(data.products.find(p => p.id === id)?.sku ?? ''); open('initialize', id); }} />}
          {view === 'customers' && <CustomerTable data={data} customers={customers} onEdit={id => open('customer', id)} onOrders={id => { navigate('orders'); setCustomerFilter(id); }} />}
          <footer className={s.tableFooter}><span>{view === 'stock' ? '当前库存为账面数量，订单不预占库存。低库存提示阈值为 10 个销售单位。' : view === 'products' ? '商品资料用于销售开单；数量变化在库存管理中查询。' : view === 'ledger' ? '每一次库存变化均保留来源记录。' : view === 'customers' ? '有效订单金额仅统计待出库与已出库订单，不代表实际收款。' : '单仓库 · 整单出库 · 不预占库存'}</span><span>本地 MVP</span></footer>
        </section>}
        </>}
        <p className={s.bottomNote}>本地单用户工作区 · 不同设备及浏览器之间不共享数据 · 清理浏览器站点数据会删除本地记录</p>
      </div>
    </div>
    {data && overlay && <Dialog key={`${overlay.type}-${overlay.id ?? ''}`} title={overlay.type === 'new' ? '新建销售订单' : overlay.type === 'edit' ? '编辑订单草稿' : overlay.type === 'detail' ? '销售订单详情' : overlay.type === 'ship' ? '确认销售出库' : overlay.type === 'cancel' ? '取消销售订单' : overlay.type === 'product' ? selectedProduct ? '编辑商品资料' : '新增商品' : overlay.type === 'product-status' ? selectedProduct?.active === false ? '启用商品' : '停用商品' : overlay.type === 'customer' ? selectedCustomer ? '编辑客户资料' : '新增客户' : '录入期初库存'} wide={['new', 'edit', 'detail', 'ship', 'product'].includes(overlay.type)} busy={busy} onClose={() => setOverlay(null)}>
      {(overlay.type === 'new' || overlay.type === 'edit') && <OrderEditor data={data} order={overlay.type === 'edit' ? selected : undefined} busy={busy} onClose={() => setOverlay(null)} onSave={async input => { const next = await mutate({ type: 'save-order', ...input }); setOverlay({ type: 'detail', id: input.orderId ?? next.orders.at(-1)!.id }); setNotice({ text: '草稿已保存，核对后可提交给仓库。' }); }} />}
      {(overlay.type === 'detail' || overlay.type === 'ship') && selected && <div className={s.detail}>
        <div className={s.orderHero}><div><span className={s.detailOverline}>销售订单</span><h3>{selected.number}</h3><p>{customerName(selected)}</p></div><span className={`${s.status} ${badgeClass[selected.status]}`}>{statusLabels[selected.status]}</span></div>
        {notice?.error && <div className={s.error} role="alert">{notice.text}</div>}
        <div className={s.detailFacts}><div>期望发货日期<strong>{selected.deliveryDate}</strong></div><div>创建时间<strong>{time(selected.createdAt)}</strong></div><div>出库单号<strong>{selected.shipmentNumber ?? '尚未出库'}</strong></div></div>
        <div className={s.tableScroll}><table className={s.dataTable}><thead><tr><th>商品</th><th className={s.numeric}>数量</th><th className={s.numeric}>单价</th><th className={s.numeric}>金额</th><th className={s.numeric}>当前库存</th></tr></thead><tbody>{selected.lines.map(line => { const product = data.products.find(p => p.id === line.productId)!; return <tr key={line.productId}><td><strong>{line.productName ?? product.name}</strong><small>{line.sku ?? product.sku}</small></td><td className={s.numeric}>{line.quantity} {line.unit ?? product.unit}</td><td className={s.numeric}>{money(line.unitPriceCents)}</td><td className={s.numeric}>{money(line.quantity * line.unitPriceCents)}</td><td className={`${s.numeric} ${product.stock < line.quantity && selected.status === 'pending' ? s.dangerText : ''}`}>{product.initialized ? product.stock : '未初始化'}</td></tr>; })}</tbody></table></div>
        {selected.note && <div className={s.note}><span>订单备注</span><p>{selected.note}</p></div>}
        {selected.status === 'shipped' && <div className={s.note}><span>退货情况：{salesReturnSummary(data, selected.id)}</span><p>原销售数量与金额保留，退货只记录实收及库存变化。</p><div className={s.actions}><button type="button" className={s.textButton} onClick={() => showReturn({ orderId: selected.id })}>查看关联退货</button>{data.salesReturns.filter(r => r.orderId === selected.id).map(r => <button type="button" key={r.id} className={s.textButton} onClick={() => showReturn({ id: r.id })}>{r.number} · {salesReturnLabels[r.status]}</button>)}</div></div>}
        {selected.cancelReason && <div className={s.warning}>取消原因：{selected.cancelReason}</div>}
        {overlay.type === 'ship' && <div className={s.warning}>请确认实物已核对并完成交接。本次将整单扣减库存，不支持部分出库；确认后不能直接撤销。</div>}
        <h4 className={s.historyTitle}>操作记录</h4><ol className={s.history}>{selected.history.toReversed().map((event, index) => <li key={`${event.at}-${index}`}><span className={s.historyDot} /><div>{event.action}<small>{event.actor} · {time(event.at)}</small></div></li>)}</ol>
        <footer className={s.dialogFoot}><span className={s.total}>订单金额<strong>{money(orderTotal(selected))}</strong></span><div className={s.actions}>
          {selected.status === 'shipped' && <button type="button" className={s.primary} disabled={busy || salesReturnSummary(data, selected.id) === '全部退货'} title={salesReturnSummary(data, selected.id) === '全部退货' ? '原订单商品已全部退回' : '按原订单登记本次退货'} onClick={() => showReturn({ orderId: selected.id, create: true })}>创建退货单</button>}
          {selected.status === 'draft' && <><button className={s.secondary} disabled={busy} onClick={() => open('edit', selected.id)}>编辑草稿</button><button className={s.primary} disabled={busy} onClick={() => { void act({ type: 'submit', orderId: selected.id }, '订单已提交，等待仓库出库。'); }}>{busy ? '提交中…' : '提交订单'}</button></>}
          {(selected.status === 'pending' || selected.status === 'draft') && <button className={s.dangerButton} disabled={busy} onClick={() => open('cancel', selected.id)}>取消订单</button>}
          {selected.status === 'pending' && (overlay.type === 'ship' ? <button className={s.primary} disabled={busy} onClick={async () => { try { await mutate({ type: 'ship', orderId: selected.id }); setNotice({ text: '出库成功，库存与流水已更新。' }); setOverlay({ type: 'detail', id: selected.id }); } catch (error) { setNotice({ text: error instanceof Error ? error.message : '出库失败', error: true }); } }}>{busy ? '正在出库…' : '确认交接并出库'}</button> : <button className={s.primary} disabled={busy} onClick={() => open('ship', selected.id)}><IconTruckDelivery size={17} />确认出库</button>)}
        </div></footer>
      </div>}
      {overlay.type === 'cancel' && selected && <ActionForm busy={busy} description={`订单 ${selected.number} 尚未出库，取消不会改变库存。`} submitLabel="确认取消订单" danger fields={[{ name: 'reason', label: '取消原因', maxLength: 300, placeholder: '请填写客户取消或需求变更等原因' }]} onSubmit={async fields => { await mutate({ type: 'cancel', orderId: selected.id, reason: fields.reason }); setOverlay({ type: 'detail', id: selected.id }); setNotice({ text: '订单已取消，库存未变更。' }); }} />}
      {overlay.type === 'customer' && <ActionForm busy={busy} description={selectedCustomer ? '更新客户资料。客户编号及原有订单关联保持不变。' : '新增客户后，可在客户管理中维护，并在销售订单中选择。'} submitLabel={selectedCustomer ? '保存修改' : '保存客户'} fields={[
        { name: 'name', label: '客户名称', maxLength: 80, placeholder: '填写企业或客户名称', defaultValue: selectedCustomer?.name },
        { name: 'contact', label: '联系人', maxLength: 50, required: false, placeholder: '选填', defaultValue: selectedCustomer?.contact },
        { name: 'phone', label: '联系电话', type: 'tel', maxLength: 40, required: false, placeholder: '选填，支持手机或固定电话', defaultValue: selectedCustomer?.phone },
      ]} onSubmit={async fields => { await mutate(selectedCustomer ? { type: 'update-customer', customerId: selectedCustomer.id, name: fields.name, contact: fields.contact, phone: fields.phone } : { type: 'add-customer', name: fields.name, contact: fields.contact, phone: fields.phone }); setOverlay(null); setNotice({ text: selectedCustomer ? '客户资料已更新。' : '客户已添加，可在客户管理中查看。' }); }} />}
      {overlay.type === 'product' && <ProductEditor product={selectedProduct} suppliers={data.suppliers} locked={productLocked} busy={busy} onSave={async input => {
        if (selectedProduct) { await mutate({ type: 'update-product', productId: selectedProduct.id, ...input }); setOverlay(null); setNotice({ text: '商品资料与供货关联已更新，历史单据保持原值。' }); }
        else { const next = await mutate({ type: 'add-product', ...input }); setOverlay(null); setNotice({ text: '商品已保存，默认零库存，可通过采购入库补货。', productId: next.products.at(-1)!.id }); }
      }} />}
      {overlay.type === 'product-status' && selectedProduct && <ActionForm busy={busy} danger={selectedProduct.active !== false} description={selectedProduct.active === false ? '启用“' + selectedProduct.name + '”后，可再次用于新订单。库存数量保持不变。' : '停用“' + selectedProduct.name + '”后不能再用于新开单，已有草稿需移除该商品或重新启用后提交；已提交的待出库订单仍可继续履行。库存及历史记录保留。'} submitLabel={selectedProduct.active === false ? '确认启用' : '确认停用'} fields={[]} onSubmit={async () => { await mutate({ type: 'set-product-active', productId: selectedProduct.id, active: selectedProduct.active === false }); setOverlay(null); setNotice({ text: selectedProduct.active === false ? '商品已启用。' : '商品已停用，库存及历史记录已保留。' }); }} />}
      {overlay.type === 'initialize' && <OpeningSetup data={data} initialId={overlay.id} busy={busy} onSave={async command => { await mutate(command); setOverlay(null); setNotice({ text: '期初设置已保存，该商品可进行日常入库和出库。' }); }} />}

    </Dialog>}
  </main>;
}

function Empty({ title, detail }: { title: string; detail: string }) { return <div className={s.empty}><span><IconBox size={28} stroke={1.4} /></span><h3>{title}</h3><p>{detail}</p></div>; }

type Field = { name: string; label: string; type?: string; defaultValue?: string; placeholder?: string; min?: string; max?: string; step?: string; maxLength?: number; required?: boolean; readOnly?: boolean; options?: { value: string; label: string }[] };
function ActionForm({ busy, description, submitLabel, fields, danger = false, onSubmit }: { busy: boolean; description: string; submitLabel: string; fields: Field[]; danger?: boolean; onSubmit: (fields: Record<string, string>) => Promise<void> }) {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const fields = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>; try { await onSubmit(fields); } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); } }
  return <form className={s.actionForm} onSubmit={submit}><p className={s.helper}>{description}</p>{error && <div className={s.error} role="alert">{error}</div>}<fieldset disabled={busy} className={s.fieldset}>{fields.map(field => <label className={s.field} key={field.name}>{field.label}{field.required !== false && <span>*</span>}{field.options ? <select name={field.name} required={field.required !== false} defaultValue={field.defaultValue ?? ''}><option value="">请选择商品</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input name={field.name} readOnly={field.readOnly} required={field.required !== false} type={field.type ?? 'text'} defaultValue={field.defaultValue} placeholder={field.placeholder} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength ?? 120} />}</label>)}</fieldset><footer className={s.dialogFoot}><span /><button className={danger ? s.dangerSolid : s.primary} disabled={busy} type="submit">{busy ? '保存中…' : submitLabel}</button></footer></form>;
}
