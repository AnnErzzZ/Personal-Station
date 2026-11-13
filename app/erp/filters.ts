import type { Workspace } from './model';
import type { View } from './navigation';

export const defaultFilters = {
  query: '', status: 'all', customer: 'all', product: 'all', kind: 'all',
  from: '', to: '', stock: 'all', unit: 'all', active: 'all', initialized: 'all',
  relationship: 'all', contact: 'all',
  supplier: 'all', receipt: 'all', count: 'all', salesReturn: 'all', sourceOrder: 'all', purchaseReturn: 'all', sourceReceipt: 'all',
};
export type Filters = typeof defaultFilters;
const localDay = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function selectRecords(data: Workspace, view: View, f: Filters) {
  const term = f.query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(term);
  const within = (date: string) => (!f.from || date >= f.from) && (!f.to || date <= f.to);
  const orders = data.orders.filter(o =>
    (view !== 'shipping' || o.status === 'pending') && (f.status === 'all' || o.status === f.status) &&
    (f.customer === 'all' || o.customerId === f.customer) &&
    (f.product === 'all' || o.lines.some(l => l.productId === f.product)) && within(o.deliveryDate) &&
    matches(`${o.number} ${data.customers.find(c => c.id === o.customerId)?.name} ${o.deliveryDate} ${localDay(o.createdAt)}`)
  ).toReversed();
  const products = data.products.filter(p => {
    const stock = !p.initialized ? 'uninitialized' : p.stock === 0 ? 'out' : p.stock <= 10 ? 'low' : 'normal';
    return matches(`${p.name} ${p.sku}`) && (f.stock === 'all' || stock === f.stock) &&
      (view !== 'products' || f.supplier === 'all' || (f.supplier === 'unlinked' ? !p.supplierIds?.length : p.supplierIds?.includes(f.supplier))) &&
      (f.unit === 'all' || p.unit === f.unit) &&
      (f.active === 'all' || (f.active === 'active' ? p.active !== false : p.active === false)) &&
      (f.initialized === 'all' || p.initialized === (f.initialized === 'yes'));
  });
  const customers = data.customers.filter(c => {
    const related = data.orders.filter(o => o.customerId === c.id);
    const complete = Boolean(c.contact?.trim() && c.phone?.trim());
    return matches(`${c.id} ${c.name} ${c.contact ?? ''} ${c.phone ?? ''}`) &&
      (f.relationship === 'all' || (f.relationship === 'has' ? related.length > 0 : f.relationship === 'none' ? !related.length : related.some(o => o.status === 'pending'))) &&
      (f.contact === 'all' || complete === (f.contact === 'complete'));
  });
  const ledger = data.ledger.filter(e => {
    const p = data.products.find(p => p.id === e.productId);
    return (f.purchaseReturn === 'all' || e.purchaseReturnId === f.purchaseReturn) && (f.salesReturn === 'all' || e.salesReturnId === f.salesReturn) && (f.count === 'all' || e.countId === f.count) && (f.receipt === 'all' || e.receiptId === f.receipt) && (f.product === 'all' || e.productId === f.product) && (f.kind === 'all' || e.kind === f.kind) &&
      within(localDay(e.at)) && matches(`${e.reference} ${p?.sku} ${p?.name} ${localDay(e.at)}`);
  }).toReversed();
  const receipts = (data.receipts ?? []).filter(r =>
    (f.status === 'all' || r.status === f.status) && (f.supplier === 'all' || r.supplierId === f.supplier) &&
    (f.product === 'all' || r.lines.some(l => l.productId === f.product)) && within(r.receiptDate) &&
    matches(`${r.number} ${r.deliveryNumber} ${r.supplierName ?? data.suppliers?.find(s => s.id === r.supplierId)?.name ?? ''}`)
  ).toReversed();
  const suppliers = (data.suppliers ?? []).filter(s => {
    const has = (data.receipts ?? []).some(r => r.supplierId === s.id);
    return matches(`${s.id} ${s.name} ${s.contact ?? ''} ${s.phone ?? ''}`) &&
      (f.active === 'all' || (s.active !== false) === (f.active === 'active')) &&
      (f.relationship === 'all' || has === (f.relationship === 'has'));
  });
  const counts = (data.counts ?? []).filter(c =>
    (f.status === 'all' || c.status === f.status) && (f.product === 'all' || c.lines.some(l => l.productId === f.product)) &&
    within(localDay(c.createdAt)) && matches(`${c.number} ${c.note} ${c.lines.map(l => `${l.productName} ${l.sku}`).join(' ')}`)
  ).toReversed();
  const salesReturns = (data.salesReturns ?? []).filter(r =>
    (f.status === 'all' || r.status === f.status) && (f.customer === 'all' || r.customerId === f.customer) &&
    (f.sourceOrder === 'all' || r.orderId === f.sourceOrder) && (f.product === 'all' || r.lines.some(l => l.productId === f.product)) &&
    within(localDay(r.createdAt)) && matches(`${r.number} ${data.orders.find(o => o.id === r.orderId)?.number ?? ''} ${r.shipmentNumber} ${r.customerName} ${r.note} ${r.lines.map(l => `${l.productName} ${l.sku}`).join(' ')}`)
  ).toReversed();
  const purchaseReturns = (data.purchaseReturns ?? []).filter(r =>
    (f.status === 'all' || r.status === f.status) && (f.supplier === 'all' || r.supplierId === f.supplier) &&
    (f.sourceReceipt === 'all' || r.receiptId === f.sourceReceipt) && (f.product === 'all' || r.lines.some(l => l.productId === f.product)) &&
    within(localDay(r.createdAt)) && matches(`${r.number} ${r.receiptNumber} ${r.deliveryNumber} ${r.supplierName} ${r.note} ${r.lines.map(l => `${l.productName} ${l.sku}`).join(' ')}`)
  ).toReversed();
  return { orders, products, customers, ledger, receipts, suppliers, counts, salesReturns, purchaseReturns };
}
