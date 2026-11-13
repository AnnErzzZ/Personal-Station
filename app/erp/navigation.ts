export const navigationGroups = [
  { id: 'sales', label: '销售管理', items: [{ id: 'orders', label: '销售订单' }, { id: 'shipping', label: '待出库' }, { id: 'salesReturns', label: '销售退货' }] },
  { id: 'purchase', label: '采购管理', items: [{ id: 'receipts', label: '采购入库' }, { id: 'purchaseReturns', label: '采购退货' }] },
  { id: 'inventory', label: '库存管理', items: [{ id: 'stock', label: '库存查询' }, { id: 'counts', label: '库存盘点' }, { id: 'ledger', label: '库存流水' }] },
  { id: 'master', label: '基础资料', items: [{ id: 'customers', label: '客户管理' }, { id: 'products', label: '商品管理' }, { id: 'suppliers', label: '供应商管理' }] },
] as const;

export type View = typeof navigationGroups[number]['items'][number]['id'];
export function getNavigation(view: View) {
  for (const group of navigationGroups) {
    const item = group.items.find(item => item.id === view);
    if (item) return { groupId: group.id, groupLabel: group.label, label: item.label };
  }
  throw new Error('页面没有配置所属模块');
}
