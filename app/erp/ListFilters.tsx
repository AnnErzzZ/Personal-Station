import type { Filters } from './filters';
import type { Workspace } from './model';
import type { View } from './navigation';
import s from './erp.module.css';

export default function ListFilters({ view, data, value, onChange }: {
  view: View; data: Workspace; value: Filters; onChange: (next: Filters) => void;
}) {
  const set = (key: keyof Filters, next: string) => onChange({ ...value, [key]: next });
  const select = (key: keyof Filters, label: string, options: [string, string][]) =>
    <label className={s.filterField} key={key}>{label}<select aria-label={`筛选${label}`} value={value[key]} onChange={e => set(key, e.target.value)}><option value="all">全部</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
  const dates = view === 'orders' || view === 'shipping' || view === 'ledger' || view === 'receipts' || view === 'counts' || view === 'salesReturns' || view === 'purchaseReturns';
  const dateLabel = view === 'ledger' ? '发生日期' : view === 'receipts' ? '收货日期' : view === 'counts' || view === 'salesReturns' || view === 'purchaseReturns' ? '创建日期' : '发货日期';
  return <>
    <div className={s.listFilters} role="group" aria-label={`${view === 'orders' ? '销售订单' : view === 'shipping' ? '待出库' : view === 'stock' ? '库存查询' : view === 'ledger' ? '库存流水' : view === 'purchaseReturns' ? '采购退货' : view === 'salesReturns' ? '销售退货' : view === 'counts' ? '库存盘点' : view === 'customers' ? '客户管理' : view === 'receipts' ? '采购入库' : view === 'suppliers' ? '供应商管理' : '商品管理'}筛选条件`}>
      {view === 'purchaseReturns' && select('status', '采购退货状态', [['draft', '草稿'], ['returned', '已出库'], ['cancelled', '已取消']])}
      {view === 'counts' && select('status', '盘点状态', [['draft', '草稿'], ['confirmed', '已确认'], ['cancelled', '已取消']])}
      {view === 'salesReturns' && select('status', '退货状态', [['draft', '草稿'], ['received', '已入库'], ['cancelled', '已取消']])}
      {(view === 'receipts' || view === 'purchaseReturns') && select('supplier', '供应商', data.suppliers.map(s => [s.id, s.name]))}
      {view === 'receipts' && select('status', '入库状态', [['draft', '草稿'], ['received', '已入库'], ['cancelled', '已取消'], ['reversed', '已冲销']])}
      {(view === 'orders' || view === 'shipping' || view === 'salesReturns') && select('customer', '客户', data.customers.map(c => [c.id, c.name]))}
      {(view === 'orders' || view === 'shipping' || view === 'ledger' || view === 'receipts' || view === 'counts' || view === 'salesReturns' || view === 'purchaseReturns') && select('product', '商品', data.products.map(p => [p.id, `${p.name} · ${p.sku}`]))}
      {view === 'ledger' && select('kind', '流水类型', [['opening', '期初库存'], ['sale', '销售出库'], ['purchase', '采购入库'], ['purchase-reversal', '入库冲销'], ['count-gain', '盘盈入库'], ['count-loss', '盘亏出库'], ['sale-return', '销售退货入库'], ['purchase-return', '采购退货出库']])}
      {view === 'stock' && select('stock', '库存状态', [['normal', '库存充足'], ['low', '库存偏低（1–10）'], ['out', '已缺货'], ['uninitialized', '待初始化']])}
      {(view === 'stock' || view === 'products') && select('unit', '销售单位', [...new Set(data.products.map(p => p.unit))].map(unit => [unit, unit]))}
      {view === 'products' && select('active', '启用状态', [['active', '已启用'], ['inactive', '已停用']])}
      {view === 'products' && select('supplier', '关联供应商', [['unlinked', '尚未关联'], ...data.suppliers.map(s => [s.id, `${s.name}${s.active === false ? '（已停用）' : ''}`] as [string, string])])}
      {view === 'suppliers' && select('active', '启用状态', [['active', '已启用'], ['inactive', '已停用']])}
      {view === 'suppliers' && select('relationship', '入库关联', [['has', '有关联入库单'], ['none', '无关联入库单']])}
      {view === 'products' && select('initialized', '期初状态', [['yes', '已就绪'], ['no', '待设置']])}
      {view === 'customers' && select('relationship', '订单关联', [['has', '有订单'], ['none', '未开单'], ['pending', '有待出库订单']])}
      {view === 'customers' && select('contact', '联系方式', [['complete', '联系人和电话齐全'], ['incomplete', '联系人或电话待补充']])}
      {dates && <>
        <label className={s.filterField}>{dateLabel}从<input type="date" aria-label={`${dateLabel}从`} value={value.from} onChange={e => set('from', e.target.value)} /></label>
        <label className={s.filterField}>{dateLabel}至<input type="date" aria-label={`${dateLabel}至`} value={value.to} onChange={e => set('to', e.target.value)} /></label>
      </>}
    </div>
    {dates && value.from && value.to && value.from > value.to && <p className={s.filterError} role="alert">开始日期不能晚于结束日期，请调整日期范围。</p>}
  </>;
}
